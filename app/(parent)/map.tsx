// app/(parent)/map.tsx
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import apiClient from "../../api/apiClient";

// 1. Upgrade the Activity Interface to match the new Database
interface Activity {
  id: number;
  title: string;
  description: string;
  category: string;
  min_age: number;
  max_age: number;
  activity_type: string;
  event_date: string | null;
  max_participants: number | null;
  current_participants: number;
  address: string;
  latitude: number;
  longitude: number;
}

export default function ParentMapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // UI States
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [childAge, setChildAge] = useState<string>("");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await apiClient.get("/activities");
        setActivities(response.data);
      } catch (error) {
        Alert.alert("Error", "Could not load map markers.");
      }
    };
    fetchActivities();
  }, []);

  // 2. The Filter Logic
  const filteredActivities = activities.filter((activity) => {
    // Check Category
    if (categoryFilter !== "all" && activity.category !== categoryFilter)
      return false;

    // Check Age (If the parent typed an age, check if it fits the activity's range)
    if (childAge !== "") {
      const ageNum = parseInt(childAge);
      if (ageNum < activity.min_age || ageNum > activity.max_age) return false;
    }

    return true;
  });

  // Loading Screen
  if (!location) {
    return (
      <View style={styles.centerContainer}>
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <ActivityIndicator size="large" color="#007AFF" />
        )}
      </View>
    );
  }

  // 3. Handle Booking an Activity
  const handleBookActivity = async () => {
    if (!selectedActivity) return;

    try {
      // For now, we use a dummy parent_id of 1. Later this will come from your secure login!
      const response = await apiClient.post("/bookings", {
        activity_id: selectedActivity.id,
        parent_id: 1,
      });

      Alert.alert("Success!", response.data.message);

      // Update the local screen so we see the +1 participant immediately without refreshing
      const updatedActivity = {
        ...selectedActivity,
        current_participants: selectedActivity.current_participants + 1,
      };
      setSelectedActivity(updatedActivity);

      setActivities(
        activities.map((act) =>
          act.id === selectedActivity.id ? updatedActivity : act,
        ),
      );
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        Alert.alert(
          "Fully Booked",
          "Sorry, there are no spots left for this event.",
        );
      } else {
        Alert.alert("Error", "Could not complete booking.");
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* --- THE FILTER BAR (TOP) --- */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.ageInput}
          placeholder="Child's Age?"
          value={childAge}
          onChangeText={setChildAge}
          keyboardType="numeric"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {["all", "education", "sport", "play"].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterPill,
                categoryFilter === cat && styles.filterPillActive,
              ]}
              onPress={() => {
                setCategoryFilter(cat);
                setSelectedActivity(null); // Close the popup if they change filters
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  categoryFilter === cat && styles.filterTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* --- THE MAP --- */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        onPress={() => setSelectedActivity(null)} // Click anywhere else to close the popup
      >
        {filteredActivities.map((activity) => (
          <Marker
            key={activity.id.toString()}
            coordinate={{
              latitude: Number(activity.latitude),
              longitude: Number(activity.longitude),
            }}
            pinColor={activity.activity_type === "limited" ? "red" : "orange"} // Red for limited events, Orange for permanent
            onPress={(e) => {
              e.stopPropagation(); // Stop the map from receiving the click
              setSelectedActivity(activity);
            }}
          />
        ))}
      </MapView>

      {/* --- THE SELECTED ACTIVITY POPUP CARD (BOTTOM) --- */}
      {selectedActivity && (
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{selectedActivity.title}</Text>
            <View
              style={[
                styles.typeBadge,
                selectedActivity.activity_type === "limited"
                  ? styles.badgeLimited
                  : styles.badgePermanent,
              ]}
            >
              <Text style={styles.badgeText}>
                {selectedActivity.activity_type === "limited"
                  ? "Event"
                  : "Permanent"}
              </Text>
            </View>
          </View>

          <Text style={styles.cardAddress}>
            📍 {selectedActivity.address || "No address provided"}
          </Text>
          <Text style={styles.cardDetails}>
            👶 Ages: {selectedActivity.min_age} to {selectedActivity.max_age}
          </Text>
          <Text style={styles.cardDetails}>
            🏷️ Category: {selectedActivity.category}
          </Text>

          {selectedActivity.activity_type === "limited" && (
            <>
              <Text style={styles.cardDetails}>
                📅 Date:{" "}
                {new Date(selectedActivity.event_date!).toLocaleString()}
              </Text>
              <Text style={styles.cardDetails}>
                👥 Spots: {selectedActivity.current_participants} /{" "}
                {selectedActivity.max_participants || "Unlimited"}
              </Text>
            </>
          )}

          <Text style={styles.cardDescription}>
            {selectedActivity.description}
          </Text>

          {/* Dynamic Booking Button */}
          {selectedActivity.activity_type === "limited" && (
            <TouchableOpacity
              style={[
                styles.bookButton,
                selectedActivity.current_participants >=
                (selectedActivity.max_participants || 9999)
                  ? styles.bookButtonDisabled
                  : null,
              ]}
              onPress={handleBookActivity}
              disabled={
                selectedActivity.current_participants >=
                (selectedActivity.max_participants || 9999)
              }
            >
              <Text style={styles.bookButtonText}>
                {selectedActivity.current_participants >=
                (selectedActivity.max_participants || 9999)
                  ? "Fully Booked"
                  : "Book a Spot"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "red", padding: 20, textAlign: "center" },
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  // Filter Bar Styles
  filterBar: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 5,
  },
  ageInput: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
    width: 90,
    marginRight: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  categoryScroll: { flexDirection: "row" },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    marginRight: 8,
    justifyContent: "center",
  },
  filterPillActive: { backgroundColor: "#007AFF" },
  filterText: { color: "#333", fontWeight: "bold" },
  filterTextActive: { color: "#fff" },

  // Bottom Card Styles
  infoCard: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: "bold", flex: 1, color: "#333" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePermanent: { backgroundColor: "#e0f7fa" },
  badgeLimited: { backgroundColor: "#ffebee" },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#333" },
  cardAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    fontWeight: "500",
  },
  cardDetails: { fontSize: 14, color: "#444", marginBottom: 3 },
  cardDescription: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },

  bookButton: {
    backgroundColor: "#34C759",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  bookButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  bookButtonDisabled: { backgroundColor: "#ccc" },
});
