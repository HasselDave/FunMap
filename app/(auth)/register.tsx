// app/auth/register.tsx
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../api/apiClient"; // Make sure this path is correct based on your folder structure!

export default function RegisterScreen() {
  const [role, setRole] = useState("parent"); // Default to parent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleRegister = async () => {
    try {
      const response = await apiClient.post("/auth/register", {
        role,
        email,
        password,
        username, // FIX 1: We removed the conditional check so it ALWAYS sends the username!
      });

      Alert.alert("Success! 🎉", response.data.message, [
        { text: "Go to Login", onPress: () => router.replace("/login") },
      ]);
    } catch (error: any) {
      if (error.response && error.response.data) {
        Alert.alert("Error", error.response.data.error);
      } else {
        Alert.alert("Error", "Could not connect to the server.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create an Account</Text>

      {/* Role Selection Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.pill, role === "parent" && styles.pillActive]}
          onPress={() => setRole("parent")}
        >
          <Text
            style={[
              styles.pillText,
              role === "parent" && styles.pillTextActive,
            ]}
          >
            I am a Parent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, role === "institution" && styles.pillActive]}
          onPress={() => setRole("institution")}
        >
          <Text
            style={[
              styles.pillText,
              role === "institution" && styles.pillTextActive,
            ]}
          >
            I am an Institution
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formCard}>
        {/* FIX 2: Removed the {role === "parent"} wrapper so it always shows up. 
            Also made the placeholder dynamic based on the role! */}
        <TextInput
          style={styles.input}
          placeholder={
            role === "parent" ? "Choose a Username" : "Institution Name"
          }
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
        >
          <Text style={styles.registerButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/login")}
        style={{ marginTop: 20 }}
      >
        <Text style={styles.loginLink}>
          Already have an account?{" "}
          <Text style={styles.loginLinkBold}>Log in here</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },

  toggleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#e0e0e0",
    borderRadius: 30,
    padding: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: { fontSize: 16, fontWeight: "600", color: "#666" },
  pillTextActive: { color: "#007AFF" },

  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  registerButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  loginLink: { textAlign: "center", fontSize: 15, color: "#555" },
  loginLinkBold: { fontWeight: "bold", color: "#007AFF" },
});
