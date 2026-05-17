// app/(parent)/map.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import apiClient from "../../api/apiClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <-- NEW: Allow it to drop down from the top
    shouldShowList: true, // <-- NEW: Allow it to show in the lock screen list
  }),
});

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
  const [searchQuery, setSearchQuery] = useState("");

  // UI States
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [childAge, setChildAge] = useState<string>("");

  const router = useRouter();

  // --- DRAWER ANIMATION STATE ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- USER PROFILE STATE ---
  const [profile, setProfile] = useState({
    username: "Loading...",
    email: "Loading...",
  });

  // --- PUSH NOTIFICATION SETUP ---
  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Failed to get push token for push notification!");
          return;
        }

        // Get the token (requires your Expo Project ID if using EAS build, otherwise works locally in Expo Go)
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({ projectId })
        ).data;

        // Grab the user from the vault and send the token to the backend
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          await apiClient.post("/users/push-token", {
            userId: user.id,
            token: pushTokenString,
          });
        }
      } else {
        console.log("Must use physical device for Push Notifications");
      }
    };

    registerForPushNotificationsAsync();
  }, []);

  // Load the data from the vault when the map opens
  // NEW: useFocusEffect runs EVERY time you return to this screen!
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          setProfile(JSON.parse(userData));
        }
      };

      loadProfile();
    }, []),
  );

  const handleLogout = async () => {
    try {
      // 1. Scrub ALL data from the vaults
      await AsyncStorage.removeItem("user");
      await SecureStore.deleteItemAsync("userToken");
      await SecureStore.deleteItemAsync("userRole");

      // 2. Force the drawer closed instantly (bypassing the animation to avoid glitches)
      setIsDrawerOpen(false);

      // 3. Route directly back to the login screen
      router.replace("/login" as any);
    } catch (error) {
      console.error("Error during logout:", error);
      // Failsafe: Try to route them anyway even if deleting storage fails
      router.replace("/login" as any);
    }
  };

  const slideAnim = React.useRef(new Animated.Value(-300)).current; // Drawer starts hidden off-screen

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0, // Slide it to the edge of the screen
      duration: 300, // 0.3 seconds
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -300, // Slide it back off-screen
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsDrawerOpen(false));
  };

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

  // New way: Only runs when the map actually comes back into view!
  useFocusEffect(
    useCallback(() => {
      const fetchActivities = async () => {
        try {
          const response = await apiClient.get("/activities");

          setActivities(response.data);

          // THE FIX: Use 'prev' to get the absolute newest state, avoiding the memory trap!
          setSelectedActivity((prev: any) => {
            if (!prev) return null; // If no card is open, do nothing
            const updated = response.data.find((a: any) => a.id === prev.id);
            return updated || prev;
          });
        } catch (error) {
          console.error("Failed to refresh activities:", error);
        }
      };

      fetchActivities();
    }, []), // <--- THE FIX: This array MUST be completely empty!
  );

  // 2. The Filter Logic (Category + Smart Search Bar)
  const filteredActivities = activities.filter((activity: any) => {
    // --- CHECK 1: Category (If you are still using the dropdown) ---
    if (categoryFilter !== "all" && activity.category !== categoryFilter) {
      return false; // Wrong category? Hide it!
    }

    // --- CHECK 2: Smart Search Bar (Title OR Age) ---
    if (searchQuery !== "") {
      const lowerCaseQuery = searchQuery.toLowerCase();

      // A. Does the text match the Title?
      const matchesTitle =
        activity.title && activity.title.toLowerCase().includes(lowerCaseQuery);

      // B. Is the text a number? If so, does it match the Age Range?
      let matchesAge = false;
      const searchNumber = parseInt(searchQuery);

      // !isNaN() checks if they successfully typed a real number (like "8" or "12")
      if (!isNaN(searchNumber)) {
        // Only true if the typed number is between min_age and max_age
        matchesAge =
          searchNumber >= activity.min_age && searchNumber <= activity.max_age;
      }

      // If it DOESN'T match the title AND it DOESN'T match the age, kick it out!
      if (!matchesTitle && !matchesAge) {
        return false;
      }
    }

    // If it survived the checks, show it on the map!
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
      // 1. Get the REAL logged-in user from the vault!
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Error", "You must be logged in to book an activity.");
        return;
      }
      const user = JSON.parse(userData);

      // 2. Send the real user's ID to the server
      const response = await apiClient.post("/bookings", {
        activity_id: selectedActivity.id,
        parent_id: user.id, // Now uses the real logged-in parent!
      });

      Alert.alert("Success! 🎉", response.data.message);

      // Update the local screen so we see the +1 participant immediately
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
      // 3. Dynamically read the exact error from our Backend Bouncer
      if (error.response && error.response.data && error.response.data.error) {
        Alert.alert(
          "Booking Failed 🛑",
          error.response.data.error, // This will show "Limit Reached!" OR "Fully booked!"
        );
      } else {
        Alert.alert("Error", "Could not complete booking. Please try again.");
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
          value={searchQuery}
          onChangeText={setSearchQuery}
          keyboardType="default"
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

      {/* --- MENU ICON (TOP LEFT) --- */}
      <TouchableOpacity style={styles.menuIcon} onPress={openDrawer}>
        <Ionicons name="menu" size={32} color="#333" />
      </TouchableOpacity>

      {/* --- DARK OVERLAY (Closes drawer when tapped) --- */}
      {isDrawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={closeDrawer}
          activeOpacity={1}
        />
      )}

      {/* --- THE SLIDING DRAWER --- */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Profile Header */}
        {/* Profile Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.avatarCircle}>
            {/* Grab the first letter of their username! */}
            <Text style={styles.avatarText}>
              {profile.username
                ? profile.username.charAt(0).toUpperCase()
                : "P"}
            </Text>
          </View>
          <Text style={styles.drawerUsername}>
            {profile.username || "Parent User"}
          </Text>
          <Text style={styles.drawerEmail}>{profile.email}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.drawerMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              closeDrawer();
              router.push("/(parent)/current-bookings");
            }}
          >
            <Ionicons name="calendar" size={24} color="#007AFF" />
            <Text style={styles.menuItemText}>Current Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              closeDrawer();
              router.push("/(parent)/previous-bookings");
            }}
          >
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.menuItemText}>Previous Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              closeDrawer();
              router.push("/(parent)/change-profile");
            }}
          >
            <Ionicons name="person" size={24} color="#007AFF" />
            <Text style={styles.menuItemText}>Change Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Log Out Button at the bottom */}
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="red" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>

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

  // --- ADD THESE TO YOUR STYLESHEET ---
  menuIcon: {
    position: "absolute",
    top: 50,
    left: 15,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 5,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 30,
  },

  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: "#fff",
    zIndex: 40,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  drawerHeader: {
    backgroundColor: "#007AFF",
    padding: 30,
    paddingTop: 60,
    alignItems: "center",
  },
  avatarCircle: {
    width: 70,
    height: 70,
    backgroundColor: "#fff",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: { fontSize: 30, fontWeight: "bold", color: "#007AFF" },
  drawerUsername: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  drawerEmail: { fontSize: 14, color: "#e0e0e0", marginTop: 2 },

  drawerMenu: { padding: 20, flex: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
    color: "#333",
    fontWeight: "500",
  },

  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginBottom: 50,
  },
  logoutText: {
    fontSize: 16,
    marginLeft: 15,
    color: "red",
    fontWeight: "bold",
  },
});
