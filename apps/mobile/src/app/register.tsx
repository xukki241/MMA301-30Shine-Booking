import { Redirect } from "expo-router";

// Customer onboarding is handled by the name + phone entry screen.
export default function RegisterRedirect() {
  return <Redirect href="/login" />;
}
