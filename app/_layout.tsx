import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This automatically loads your (auth) login screen */}
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
