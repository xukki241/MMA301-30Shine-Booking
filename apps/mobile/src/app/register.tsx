// Register screen - customer and staff registration flow
import { Redirect } from "expo-router";

// Customer registration starts with the shared phone lookup screen.
export default function RegisterRedirect() {
  return <Redirect href="/login" />;
}
