import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../api/apiClient"; // Make sure this path matches!

export default function CurrentBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // 1. Get the logged-in user's ID from the vault
        const userData = await AsyncStorage.getItem("user");
        if (!userData) return;

        const user = JSON.parse(userData);

        // 2. Ask the backend for their bookings
        const response = await apiClient.get(`/bookings/current/${user.id}`);
        setBookings(response.data);
      } catch (error) {
        console.error("Failed to load bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // --- Cancel a Booking ---
  const handleCancel = (bookingId: number) => {
    // Show a confirmation popup first!
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? You will lose your spot.",
      [
        { text: "Nevermind", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive", // Makes the button red on iOS
          onPress: async () => {
            try {
              // 1. Tell the backend to delete it
              await apiClient.delete(`/bookings/${bookingId}`);

              // 2. Instantly remove it from the screen without refreshing!
              setBookings((prevBookings) =>
                prevBookings.filter((b: any) => b.booking_id !== bookingId),
              );

              Alert.alert(
                "Cancelled",
                "Your booking has been successfully removed.",
              );
            } catch (error) {
              console.error("Failed to cancel:", error);
              Alert.alert(
                "Error",
                "Could not cancel the booking. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  // How each individual booking card should look
  const renderBookingCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.activity_type === "permanent" ? "Permanent" : "Event"}
          </Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <Ionicons name="location" size={16} color="#666" />
        <Text style={styles.cardText}>{item.address}</Text>
      </View>

      {item.event_date && (
        <View style={styles.cardRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.cardText}>
            {new Date(item.event_date).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* NEW: The Cancel Button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleCancel(item.booking_id)}
      >
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        <Text style={styles.cancelButtonText}>Cancel Booking</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={32} color="#333" />
      </TouchableOpacity>

      <Text style={styles.header}>Current Bookings</Text>

      {/* Loading Spinner OR The List OR Empty State */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 50 }}
        />
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            You don't have any upcoming bookings yet!
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.booking_id.toString()}
          renderItem={renderBookingCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    paddingTop: 50,
  },
  closeButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginTop: 40,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  badge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#007AFF", fontSize: 12, fontWeight: "bold" },

  cardRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  cardText: { fontSize: 14, color: "#666", marginLeft: 6, flex: 1 },

  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 15,
    textAlign: "center",
  },

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    paddingVertical: 10,
    backgroundColor: "#FFEBEA",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#FF3B30",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 5,
  },
});
