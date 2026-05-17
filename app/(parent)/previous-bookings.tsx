import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../api/apiClient"; // Adjust path if needed!

export default function PreviousBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchPreviousBookings = async () => {
        try {
          setLoading(true);

          // Get the real logged-in user!
          const userData = await AsyncStorage.getItem("user");
          if (!userData) return;
          const user = JSON.parse(userData);

          const response = await apiClient.get(`/bookings/previous/${user.id}`);
          setBookings(response.data);
        } catch (error) {
          console.error("Failed to fetch previous bookings:", error);
          Alert.alert("Error", "Could not load your history.");
        } finally {
          setLoading(false);
        }
      };

      fetchPreviousBookings();
    }, []),
  );

  // 2. The Layout for a Single Past Event Card
  const renderBookingCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Completed</Text>
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
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Main Content */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.booking_id.toString()}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                You haven't attended any events yet!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// 3. Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#333", flex: 1 },
  badge: {
    backgroundColor: "#E5F2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#007AFF", fontSize: 12, fontWeight: "bold" },
  cardRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  cardText: { color: "#666", marginLeft: 8, fontSize: 14 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: { color: "#999", fontSize: 16, marginTop: 15 },
});
