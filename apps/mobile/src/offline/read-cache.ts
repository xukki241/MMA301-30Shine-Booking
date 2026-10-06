import type { Connectivity } from "./connectivity";

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
};

export type ReadResult<T> =
  | { kind: "fresh" | "cached"; items: T[] }
  | { kind: "offline-empty" }
  | { kind: "error" };

type Snapshot<T> = { version: 1; items: T[] };

export async function readCachedList<T>(
  connectivity: Connectivity,
  key: string,
  storage: KeyValueStorage,
  isItem: (value: unknown) => value is T,
  loadOnline: () => Promise<T[]>
): Promise<ReadResult<T>> {
  if (connectivity !== "online") {
    try {
      const raw = await storage.getItem(key);
      if (!raw) return { kind: "offline-empty" };
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { kind: "offline-empty" };
      const snapshot = parsed as Partial<Snapshot<unknown>>;
      if (snapshot.version !== 1 || !Array.isArray(snapshot.items) || !snapshot.items.every(isItem)) {
        return { kind: "offline-empty" };
      }
      return { kind: "cached", items: snapshot.items };
    } catch {
      return { kind: "offline-empty" };
    }
  }

  try {
    const items = await loadOnline();
    if (!Array.isArray(items) || !items.every(isItem)) return { kind: "error" };
    try {
      await storage.setItem(key, JSON.stringify({ version: 1, items } satisfies Snapshot<T>));
    } catch {
      // A storage failure does not hide a successful online read.
    }
    return { kind: "fresh", items };
  } catch {
    return { kind: "error" };
  }
}
