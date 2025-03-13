import React, { useRef, useState } from "react";
import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { FontAwesome6 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Replace with your API Gateway endpoint URL
const API_URL = "https://ucxzs3tf2l.execute-api.us-west-1.amazonaws.com/dev/process-image";

export default function TestCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  // We'll keep the camera view active; show result as overlay
  const [result, setResult] = useState<{ label: string; description: string } | null>(null);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionBox}>
          <AntDesign name="camera" size={64} color="#444" style={styles.permissionIcon} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera to identify objects.
          </Text>
          <Pressable 
            style={styles.permissionButton} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Capture the image with base64 encoding and send it to the API
  const takePicture = async () => {
    console.log("takePicture function called"); // Start of function
    try {
      console.log("Attempting to take picture");
      // Only adjust quality - width is not a valid parameter for takePictureAsync
      const photo = await ref.current?.takePictureAsync({ 
        base64: true,
        quality: 0.5 // Reduce quality to 50%
      });
      console.log("Photo taken:", photo ? "success" : "failed");
      
      if (!photo || !photo.base64) {
        console.log("No photo or base64 data available");
        return;
      }
      
      console.log("Base64 data length:", photo.base64.length);
      console.log("About to send API request to:", API_URL);
      
      // Add loading state
      setResult({ label: "Processing...", description: "Analyzing your image..." });
      
      // Send the base64 image to your API Gateway endpoint
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: photo.base64,
          system_prompt: `You are an expert biologist specializing in frog anatomy. Your task is to analyze images of 3D printed models of frog organs and provide information about them. These models represent frog organs but may not look exactly like real organs. For every image:

1. ALWAYS identify the organ model as one of the following: heart, stomach, lungs, liver, gall bladder, or pancreas. If unsure, make your best guess based on the shape and features of the model.

2. Provide a brief, simple description of the real organ's function in a frog.

3. Share an interesting fact about the organ, suitable for 13-14 year old students.

Never say you can't identify the image. If the model is unclear, choose the most likely organ from the list provided based on its characteristics.

Response format:
"Organ Model: [Name of the organ]
Function in Frogs: [Brief, simple description of what the organ does in a real frog]
Fun Fact: [An interesting, age-appropriate fact about the organ]"

Remember, your audience is young students, so keep explanations simple and engaging. Focus on what the 3D printed model represents, not on the fact that it's a model.`
        }),
      });
      
      // Check response status
      if (!response.ok) {
        console.log(`Error response: ${response.status} ${response.statusText}`);
        setResult({ label: "Error", description: `Server error: ${response.status}. Please try again.` });
        return;
      }
      
      const data = await response.json();
      console.log("API response data:", data);
      
      // Check for error message in response
      if (data.message === "Request Entity Too Large") {
        console.log("Image too large for API");
        setResult({ label: "Error", description: "Image too large. Please try again with a simpler image." });
        return;
      }
      
      // Expecting data to have { label, description }
      if (!data || !data.description) {
        console.log("Invalid response data:", data);
        setResult({ label: "Error", description: "Invalid response from server. Please try again." });
        return;
      }
      
      setResult(data);
    } catch (error) {
      console.error("Error processing image:", error);
      setResult({ label: "Error", description: "Failed to process image. Please try again." });
    }
  };

  const recordVideo = async () => {
    if (recording) {
      setRecording(false);
      ref.current?.stopRecording();
      return;
    }
    setRecording(true);
    const video = await ref.current?.recordAsync();
    console.log({ video });
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "picture" ? "video" : "picture"));
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  // Render the camera view with an overlay for the result
  const renderCamera = () => {
    return (
      <CameraView
        style={styles.camera}
        ref={ref}
        mode={mode}
        facing={facing}
        mute={false}
        responsiveOrientationWhenOrientationLocked
      >
        {/* Overlay for displaying result */}
        {result && (
          <View style={styles.resultOverlay}>
            {/* <Text style={styles.resultText}>Label: {result.label}</Text> */}
            <Text style={styles.resultText}>{result.description}</Text>
            <Pressable style={styles.clearButton} onPress={() => setResult(null)}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          </View>
        )}
        <SafeAreaView style={styles.shutterContainer}>
          <Pressable onPress={toggleMode}>
            {mode === "picture" ? (
              <AntDesign name="picture" size={32} color="white" />
            ) : (
              <Feather name="video" size={32} color="white" />
            )}
          </Pressable>
          <Pressable onPress={mode === "picture" ? takePicture : recordVideo}>
            {({ pressed }) => (
              <View style={[styles.shutterBtn, { opacity: pressed ? 0.5 : 1 }]}>
                <View
                  style={[
                    styles.shutterBtnInner,
                    { backgroundColor: mode === "picture" ? "white" : "red" },
                  ]}
                />
              </View>
            )}
          </Pressable>
          <Pressable onPress={toggleFacing}>
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </Pressable>
        </SafeAreaView>
      </CameraView>
    );
  };

  return <View style={styles.container}>{renderCamera()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionBox: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionIcon: {
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#333",
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#666",
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  shutterContainer: {
    position: "absolute",
    bottom: 55,
    left: 0,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  resultOverlay: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  resultText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  clearButton: {
    marginTop: 10,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  clearButtonText: {
    color: "black",
    fontSize: 14,
  },
});