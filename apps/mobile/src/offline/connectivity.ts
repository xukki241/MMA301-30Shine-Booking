export type Connectivity = "unknown" | "online" | "offline";

export type ConnectionSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export function connectivityFromSnapshot(snapshot: ConnectionSnapshot): Connectivity {
  if (snapshot.isConnected === false || snapshot.isInternetReachable === false) return "offline";
  if (snapshot.isConnected === true) return "online";
  return "unknown";
}
