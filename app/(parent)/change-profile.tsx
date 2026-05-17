import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../api/apiClient"; // Make sure this path is correct!

export default function ChangeProfileScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [userVault, setUserVault] = useState<any>(null); // To hold the whole vault object

  // 1. When the screen opens, grab their current username from the vault
  useEffect(() => {
    const loadProfile = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserVault(parsedUser);
        setUsername(parsedUser.username || ""); // Put their current name in the input box!
      }
    };
    loadProfile();
  }, []);

  // 2. Handle the Save Button
  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      // A. Send the new name to the backend kitchen
      await apiClient.put("/users/update-profile", {
        userId: userVault.id,
        username: username,
      });

      // B. Update the local vault so the Drawer updates instantly!
      const updatedUser = { ...userVault, username: username };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

      // C. Show success and go back to the map
      Alert.alert("Success! 🎉", "Your profile has been updated.", [
        { text: "Awesome", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", "Could not update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={32} color="#333" />
      </TouchableOpacity>

      <Text style={styles.header}>Change Profile</Text>
      <Text style={styles.subtitle}>
        Update your public display name below.
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
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
  header: { fontSize: 28, fontWeight: "bold", color: "#333", marginTop: 40 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30, marginTop: 5 },

  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  label: { fontSize: 14, fontWeight: "bold", color: "#555", marginBottom: 8 },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },

  saveButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: { backgroundColor: "#A0CFFF" },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
