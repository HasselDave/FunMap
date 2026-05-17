import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import apiClient from "../../api/apiClient"; // Check this path matches your folder structure!

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      // 1. Send credentials to your MySQL Bridge
      const response = await apiClient.post("/auth/login", { email, password });
      console.log("SERVER RESPONSE:", response.data);

      // 2. Extract ALL data from response (Added id, userEmail, and username!)
      // Note: We use "email: userEmail" so it doesn't conflict with your typed email state
      const {
        token,
        role,
        id,
        email: userEmail,
        username,
        isVerified,
      } = response.data;

      // 3. Save securely on the device
      await SecureStore.setItemAsync("userToken", token);
      await SecureStore.setItemAsync("userRole", role);

      // 💾 NEW: Save the profile data to the vault for the Profile Drawer!
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          id: id,
          role: role,
          email: userEmail,
          username: username,
          isVerified: isVerified,
        }),
      );

      // 4. Redirect based on role
      if (role === "parent") {
        router.replace("/(parent)/map");
      } else if (role === "admin") {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(institution)/menu");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Login Failed", "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JoyMap</Text>
      <Text style={styles.subtitle}>Login to find activities</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>
      {/* Add this right below your Login button */}
      <TouchableOpacity
        onPress={() => router.replace("/register")}
        style={{ marginTop: 20 }}
      >
        <Text style={{ textAlign: "center", color: "#555", fontSize: 15 }}>
          Don't have an account?{" "}
          <Text style={{ fontWeight: "bold", color: "#007AFF" }}>Sign up</Text>
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
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
