// app/(admin)/dashboard.tsx
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import apiClient from "../../api/apiClient";

interface Institution {
  id: number;
  email: string;
  is_verified: number; // MySQL sends booleans as 1 (true) or 0 (false)
  document_url: string | null;
}

export default function AdminDashboard() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Fetch all institutions when the screen loads
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

  // The function to verify an institution
  const handleVerify = async (id: number, email: string) => {
    try {
      await apiClient.put(`/admin/verify/${id}`);
      Alert.alert("Success", `${email} has been verified!`);
      // Refresh the list so the UI updates
      fetchInstitutions();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not verify institution.");
    }
  };

  // How each institution card should look
  const renderInstitution = ({ item }: { item: Institution }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.emailText}>{item.email}</Text>
        <Text
          style={
            item.is_verified ? styles.statusVerified : styles.statusPending
          }
        >
          Status: {item.is_verified ? "Verified ✅" : "Pending ⏳"}
        </Text>
        {item.document_url && (
          <Text style={styles.docText}>📄 Document attached</Text>
        )}
      </View>

      {!item.is_verified && (
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => handleVerify(item.id, item.email)}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
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
    backgroundColor: "#f5f5f5",
    paddingTop: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  cardInfo: { flex: 1 },
  emailText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statusPending: { fontSize: 14, color: "#FFA500", fontWeight: "bold" },
  statusVerified: { fontSize: 14, color: "#34C759", fontWeight: "bold" },
  docText: { fontSize: 12, color: "#007AFF", marginTop: 4 },
  verifyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
    fontSize: 16,
  },
});
