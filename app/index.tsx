import { Redirect } from "expo-router";

export default function RootIndex() {
  // This catches the app the millisecond it opens and forces it to go to the login screen!
  return <Redirect href="/(auth)/login" />;
}
