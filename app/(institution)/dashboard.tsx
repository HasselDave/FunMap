// app/(institution)/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
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

export default function InstitutionDashboard() {
  // Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Location
  const [address, setAddress] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // NEW: Teacher's Requirements
  const [category, setCategory] = useState("education"); // Default category
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [activityType, setActivityType] = useState("permanent"); // 'permanent' or 'limited'
  const [eventDate, setEventDate] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [maxSpotsPerUser, setMaxSpotsPerUser] = useState("2");

  // 📍 1. Handle Tapping on the Map
  const handleMapPress = async (event: any) => {
    const coords = event.nativeEvent.coordinate;
    setSelectedLocation(coords);

    try {
      const geocode = await Location.reverseGeocodeAsync(coords);
      if (geocode.length > 0) {
        const place = geocode[0];
        const streetName = `${place.street || ""} ${place.streetNumber || ""}, ${place.city || ""}`;
        setAddress(streetName.trim());
      }
    } catch (error) {
      console.log("Could not find street name.");
    }
  };

  // 🔍 2. Handle Typing an Address
  const handleSearchAddress = async () => {
    if (!address) return;
    try {
      const result = await Location.geocodeAsync(address);
      if (result.length > 0) {
        setSelectedLocation({
          latitude: result[0].latitude,
          longitude: result[0].longitude,
        });
      } else {
        Alert.alert("Not Found", "Could not find this address.");
      }
    } catch (error) {
      Alert.alert("Error", "Location search failed.");
    }
  };

  // 💾 3. Save to Database
  const handleSaveActivity = async () => {
    if (!title || !selectedLocation) {
      Alert.alert("Error", "Title and Map Pin are required!");
      return;
    }

    try {
      // 1. Get the REAL logged-in user from the vault
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Error", "You must be logged in to create an activity.");
        return;
      }
      const user = JSON.parse(userData);

      // 2. Use user.id instead of the hardcoded 2
      await apiClient.post("/activities", {
        institution_id: user.id, // <--- THE FIX!
        title,
        description,
        address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        category,
        min_age: parseInt(minAge) || 0,
        max_age: parseInt(maxAge) || 18,
        activity_type: activityType,
        event_date: activityType === "limited" ? eventDate : null,
        max_participants:
          activityType === "limited" ? parseInt(maxParticipants) : null,
        max_spots_per_user: parseInt(maxSpotsPerUser) || 2,
      });

      Alert.alert("Success!", "Activity added to the map.");
      // ... rest of your code

      // Clear form after saving
      setTitle("");
      setDescription("");
      setAddress("");
      setSelectedLocation(null);
      setMinAge("");
      setMaxAge("");
      setEventDate("");
      setMaxParticipants("");
      setMaxSpotsPerUser("2");
    } catch (error: any) {
      // 🛡️ Catch the specific 403 Forbidden error from our backend bouncer!
      if (error.response && error.response.status === 403) {
        Alert.alert(
          "Hold on! 🛑",
          "An Admin must review your documents and verify your account before you can publish to the map.",
        );
      } else {
        console.error(error);
        Alert.alert("Error", "Could not save activity.");
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create Activity</Text>

      <View style={styles.formCard}>
        {/* --- BASIC INFO --- */}
        <Text style={styles.sectionTitle}>Basic Info</Text>
        <TextInput
          style={styles.input}
          placeholder="Activity Title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* --- CATEGORY --- */}
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.row}>
          {["education", "sport", "play"].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.pillText,
                  category === cat && styles.pillTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- AGE RANGE --- */}
        <Text style={styles.sectionTitle}>Age Range</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Min Age"
            value={minAge}
            onChangeText={setMinAge}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Max Age"
            value={maxAge}
            onChangeText={setMaxAge}
            keyboardType="numeric"
          />
        </View>

        {/* --- TYPE (Permanent vs Limited) --- */}
        <Text style={styles.sectionTitle}>Activity Type</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.pill,
              activityType === "permanent" && styles.pillActive,
            ]}
            onPress={() => setActivityType("permanent")}
          >
            <Text
              style={[
                styles.pillText,
                activityType === "permanent" && styles.pillTextActive,
              ]}
            >
              Permanent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pill,
              activityType === "limited" && styles.pillActive,
            ]}
            onPress={() => setActivityType("limited")}
          >
            <Text
              style={[
                styles.pillText,
                activityType === "limited" && styles.pillTextActive,
              ]}
            >
              Limited Event
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- CONDITIONAL LIMITED EVENT FIELDS --- */}
        {activityType === "limited" && (
          <View style={styles.limitedBox}>
            <TextInput
              style={styles.input}
              placeholder="Date & Time (e.g. 2024-12-01 14:00)"
              value={eventDate}
              onChangeText={setEventDate}
            />
            <TextInput
              style={styles.input}
              placeholder="Max Participants (e.g. 20)"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
            />
            {/* Dynamic Limit Input */}
            <TextInput
              style={styles.input}
              placeholder="Max Spots Per Family (Default: 2)"
              value={maxSpotsPerUser}
              onChangeText={setMaxSpotsPerUser}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* --- LOCATION --- */}
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Type address to search"
            value={address}
            onChangeText={setAddress}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchAddress}
          >
            <Text style={styles.searchButtonText}>Find</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 47.0512,
              longitude: 21.9324,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker coordinate={selectedLocation} pinColor="green" />
            )}
          </MapView>
        </View>

        {/* --- SUBMIT --- */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveActivity}
        >
          <Text style={styles.saveButtonText}>Publish to Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    paddingTop: 40,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  halfInput: { flex: 0.48 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  pill: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: "center",
  },
  pillActive: { backgroundColor: "#007AFF" },
  pillText: { color: "#007AFF", fontWeight: "bold" },
  pillTextActive: { color: "#fff" },
  limitedBox: {
    backgroundColor: "#eef8ff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#cce7ff",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  searchButton: { backgroundColor: "#007AFF", padding: 15, borderRadius: 8 },
  searchButtonText: { color: "#fff", fontWeight: "bold" },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  map: { width: "100%", height: "100%" },
  saveButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
