// app/(institution)/dashboard.tsx
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function InstitutionDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear the token and go back to login
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userRole");
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Institution Dashboard</Text>
      <View style={styles.card}>
        <Text style={styles.stat}>0 Active Listings</Text>
      </View>
      <Button title="Log Out" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  card: {
    padding: 20,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  stat: { fontSize: 18 },
});
