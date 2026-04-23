import "@/global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="screen/CustomerDashboard" options={{ headerShown: false }} />
      {/* <Stack.Screen name="registraion" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
      <Stack.Screen name="customer/customerDashboard" options={{ headerShown: false }} />
      <Stack.Screen name="staff/staffDashboard" options={{ headerShown: false }} /> */}
    </Stack>
  );
}