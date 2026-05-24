import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import apiClient from "../../api/apiClient"; // Make sure this path is correct!

export default function VerifyInstitution() {
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 1. Let them pick a picture from their camera roll
  const pickImage = async () => {
    // Ask for permission first!
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "We need access to your camera roll to upload documents.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8, // Compress it slightly so it doesn't crash the server
    });

    if (!result.canceled) {
      setDocumentImage(result.assets[0].uri);
    }
  };

  // 2. Send the picture to the server
  const handleUpload = async () => {
    if (!documentImage) {
      Alert.alert("Error", "Please select a document first.");
      return;
    }

    setUploading(true);

    try {
      const userPackage = await AsyncStorage.getItem("user");
      if (!userPackage) return;
      const user = JSON.parse(userPackage);

      // We have to use FormData to send physical files (images) to a Node server
      const formData = new FormData();

      // Append the image
      formData.append("document", {
        uri: documentImage,
        name: `cui_${user.id}.jpg`, // Give it a smart name
        type: "image/jpeg",
      } as any);

      // Append who is uploading it
      formData.append("institution_id", user.id);

      // Send it! (We will build this route on the backend next)
      await apiClient.post("/institutions/upload-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Success!", "Your documents have been submitted for review.");
      router.back(); // Send them back to the menu
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Could not upload document. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Ionicons
          name="shield-checkmark-outline"
          size={60}
          color="#007AFF"
          style={styles.icon}
        />
        <Text style={styles.title}>Verify Your Institution</Text>
        <Text style={styles.description}>
          To keep JoyMap safe for families, we require a picture of your
          official registration document (Certificat de Înregistrare - CUI).
        </Text>

        {/* Image Preview Box */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {documentImage ? (
            <Image
              source={{ uri: documentImage }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="camera-outline" size={40} color="#8E8E93" />
              <Text style={styles.placeholderText}>
                Tap to select from Camera Roll
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            !documentImage && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!documentImage || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Submit for Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: { padding: 5, marginLeft: -5 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1C1C1E" },
  content: { paddingHorizontal: 20, alignItems: "center" },
  icon: { marginBottom: 15 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1C1C1E",
  },
  description: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  imagePicker: {
    width: "100%",
    height: 200,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholderText: { marginTop: 10, color: "#8E8E93", fontSize: 16 },
  previewImage: { width: "100%", height: "100%" },
  uploadButton: {
    backgroundColor: "#007AFF",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  uploadButtonDisabled: { backgroundColor: "#A1C6FF" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
