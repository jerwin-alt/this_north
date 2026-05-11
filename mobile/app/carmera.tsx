import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function CameraCapture({ onCapture }: { onCapture: (uri: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission required</Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.grantBtn}
        >
          <Text style={styles.grantText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      onCapture(photo.uri);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} />

      <TouchableOpacity onPress={takePicture} style={styles.captureBtn}>
        <Text style={styles.captureText}>Capture</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  text: {
    marginBottom: 12,
    fontSize: 16,
    color: "#333",
  },
  grantBtn: {
    backgroundColor: "#4F5F52",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  grantText: {
    color: "#fff",
    fontWeight: "600",
  },
  captureBtn: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  captureText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F5F52",
  },
});