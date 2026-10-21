import { Redirect } from "expo-router";

// Customer registration starts with the shared phone lookup screen.
export default function RegisterRedirect() {
  return <Redirect href="/login" />;
}
