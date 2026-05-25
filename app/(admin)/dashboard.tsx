import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../api/apiClient";

// 🚨 UPDATE THIS TO YOUR LAPTOP'S WI-FI IP ADDRESS
const BASE_URL = "https://joymap-api.onrender.com";

interface Institution {
  id: number;
  email: string;
  is_verified: number;
  verification_document: string | null; // Updated to match your MySQL database
}

export default function AdminDashboard() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await apiClient.get("/admin/institutions");
      setInstitutions(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load institutions.");
    }
  };

  const handleVerify = async (id: number, email: string) => {
    try {
      await apiClient.put(`/admin/verify/${id}`);
      Alert.alert("Success", `${email} has been verified!`);
      fetchInstitutions(); // Refresh the list!
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not verify institution.");
    }
  };

  const handleReject = async (id: number, email: string) => {
    Alert.alert(
      "Reject Institution",
      `Are you sure you want to reject and delete ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              // Call the new backend delete route!
              await apiClient.delete(`/admin/reject/${id}`);
              Alert.alert("Rejected", `${email} has been removed.`);
              fetchInstitutions(); // Refresh the list!
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Could not reject institution.");
            }
          },
        },
      ],
    );
  };

  const renderInstitution = ({ item }: { item: Institution }) => (
    <View style={styles.card}>
      {/* --- 1. THE TEXT INFO --- */}
      <View style={styles.cardHeader}>
        <Text style={styles.emailText}>{item.email}</Text>
        <Text
          style={
            item.is_verified ? styles.statusVerified : styles.statusPending
          }
        >
          Status: {item.is_verified ? "Verified ✅" : "Pending ⏳"}
        </Text>
      </View>

      {/* --- 2. THE DOCUMENT VIEWER --- */}
      {item.verification_document ? (
        <Image
          source={{ uri: item.verification_document }}
          style={styles.documentImage}
        />
      ) : (
        <View style={styles.noDocContainer}>
          <Text style={styles.noDocText}>No document uploaded yet</Text>
        </View>
      )}

      {/* --- 3. THE ACTION BUTTONS --- */}
      {!item.is_verified && item.verification_document && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleVerify(item.id, item.email)}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id, item.email)}
          >
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Portal</Text>
      <Text style={styles.subtitle}>Review and verify institutions</Text>

      <FlatList
        data={institutions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderInstitution}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No institutions found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F2F2F7",
    paddingTop: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 15,
  },
  emailText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  statusPending: { fontSize: 14, color: "#FF9500", fontWeight: "bold" },
  statusVerified: { fontSize: 14, color: "#34C759", fontWeight: "bold" },
  documentImage: {
    width: "100%",
    height: 250, // Nice and big so you can actually read the document!
    borderRadius: 12,
    resizeMode: "cover", // Crops it perfectly to fit the box
    backgroundColor: "#E5E5EA",
    marginBottom: 15,
  },
  noDocContainer: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  noDocText: { color: "#8E8E93", fontStyle: "italic" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12, // Puts space between the buttons
  },
  actionButton: {
    flex: 1, // Makes the buttons equal width
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  approveButton: { backgroundColor: "#34C759" },
  rejectButton: { backgroundColor: "#FF3B30" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 20,
    fontSize: 16,
  },
});
