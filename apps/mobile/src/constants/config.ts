/**
 * Mobile app configuration constants.
 *
 * CORE_API_URL: Base URL of the Core API service.
 * Set to your local dev server (e.g. http://10.0.2.2:4102 for Android emulator,
 * or http://localhost:4102 for web/iOS simulator).
 *
 * In production, replace with the deployed API URL.
 *
 * USE_DEMO_ADAPTER: When true, the booking wizard uses the local demo adapter
 * (no network required). When false, it calls the real Core API.
 */
export const CORE_API_URL =
  process.env.EXPO_PUBLIC_CORE_API_URL ?? "http://10.0.2.2:4102";

export const USE_DEMO_ADAPTER =
  process.env.EXPO_PUBLIC_USE_DEMO_ADAPTER !== "false";
