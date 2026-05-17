import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function InstitutionMenu() {
  // --- STATE CONTAINERS (This is where setIsVerified lives!) ---
  const [institutionName, setInstitutionName] = useState("Loading...");
  const [isVerified, setIsVerified] = useState(false);

  // --- AUTOMATIC BACKPACK CHECKER ---
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userPackage = await AsyncStorage.getItem("user");

        if (userPackage) {
          const userData = JSON.parse(userPackage);

          // 🚨 BEACON 2: Print what we pulled out of the backpack!
          console.log("BACKPACK CONTENTS:", userData);

          if (userData.username) {
            setInstitutionName(userData.username);
          }
          if (userData.isVerified) {
            setIsVerified(true);
          }
        }
      } catch (error) {
        console.error("Error loading institution data:", error);
      }
    };

    loadUserData();
  }, []);

  // --- LOGOUT HANDLER ---
  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- HEADER SECTION --- */}
      <View style={styles.header}>
        <Text style={styles.institutionName}>{institutionName}</Text>

        {/* The checkmark will only appear if isVerified is true! */}
        {isVerified && (
          <Ionicons
            name="checkmark-circle"
            size={28}
            color="#007AFF"
            style={styles.badge}
          />
        )}
      </View>

      <Text style={styles.subtitle}>Institution Menu</Text>

      {/* --- MENU BUTTONS --- */}
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push("/(institution)/my-activities")}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="list" size={24} color="white" />
            <Text style={styles.buttonText}>My Activities</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, styles.createButton]}
          onPress={() => router.push("/(institution)/dashboard")}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Create Event</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* --- LOGOUT BUTTON --- */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 5,
  },
  institutionName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  badge: {
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 40,
  },
  menuContainer: {
    gap: 15,
  },
  menuButton: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButton: {
    backgroundColor: "#007AFF",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    backgroundColor: "#FFE5E5",
    borderRadius: 16,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 18,
    fontWeight: "bold",
  },
});
