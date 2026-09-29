import assert from "node:assert/strict";
import test from "node:test";

import { isAppointmentSummary } from "../src/offline/appointments.ts";
import { OFFLINE_BOOKING_MESSAGE, runOnlineBooking } from "../src/offline/booking-write.ts";
import { connectivityFromSnapshot } from "../src/offline/connectivity.ts";
import { readCachedList } from "../src/offline/read-cache.ts";

const key = "test:appointments";
const appointment = { id: "a1", startTime: "2030-10-20T10:00:00.000Z", status: "booked" };

function memoryStorage() {
  const values = new Map();
  return {
    async getItem(name) { return values.get(name) ?? null; },
    async setItem(name, value) { values.set(name, value); }
  };
}

test("online successful read returns data and saves a validated snapshot", async () => {
  const storage = memoryStorage();
  const result = await readCachedList("online", key, storage, isAppointmentSummary, async () => [appointment]);
  assert.deepEqual(result, { kind: "fresh", items: [appointment] });
  assert.deepEqual(JSON.parse(await storage.getItem(key)), { version: 1, items: [appointment] });
});

test("a storage write failure does not hide a successful online read", async () => {
  const storage = { async getItem() { return null; }, async setItem() { throw new Error("full"); } };
  assert.deepEqual(await readCachedList("online", key, storage, isAppointmentSummary, async () => [appointment]), {
    kind: "fresh", items: [appointment]
  });
});

test("offline reads cached data without calling the online loader", async () => {
  const storage = memoryStorage();
  await storage.setItem(key, JSON.stringify({ version: 1, items: [appointment] }));
  let calls = 0;
  const result = await readCachedList("offline", key, storage, isAppointmentSummary, async () => {
    calls += 1;
    throw new Error("network must not be used");
  });
  assert.deepEqual(result, { kind: "cached", items: [appointment] });
  assert.equal(calls, 0);
});

test("missing, corrupt, and unreadable offline snapshots return an offline empty state", async () => {
  const storage = memoryStorage();
  const load = async () => { throw new Error("network must not be used"); };
  assert.deepEqual(await readCachedList("offline", key, storage, isAppointmentSummary, load), { kind: "offline-empty" });
  await storage.setItem(key, "not json");
  assert.deepEqual(await readCachedList("offline", key, storage, isAppointmentSummary, load), { kind: "offline-empty" });
  await storage.setItem(key, JSON.stringify({ version: 1, items: [{ id: "bad" }] }));
  assert.deepEqual(await readCachedList("offline", key, storage, isAppointmentSummary, load), { kind: "offline-empty" });
  assert.deepEqual(await readCachedList("offline", key, { ...storage, async getItem() { throw new Error("storage failed"); } }, isAppointmentSummary, load), { kind: "offline-empty" });
});

test("online read refreshes stale cache; a failed fetch offers retry without overwriting it", async () => {
  const storage = memoryStorage();
  await storage.setItem(key, JSON.stringify({ version: 1, items: [appointment] }));
  assert.deepEqual(await readCachedList("online", key, storage, isAppointmentSummary, async () => { throw new Error("offline"); }), { kind: "error" });
  assert.deepEqual(await readCachedList("offline", key, storage, isAppointmentSummary, async () => []), { kind: "cached", items: [appointment] });
  const updated = { ...appointment, status: "completed" };
  assert.deepEqual(await readCachedList("online", key, storage, isAppointmentSummary, async () => [updated]), { kind: "fresh", items: [updated] });
  assert.deepEqual(await readCachedList("offline", key, storage, isAppointmentSummary, async () => []), { kind: "cached", items: [updated] });
});

test("offline booking is rejected without invoking or queuing a write, including after reconnect", async () => {
  let calls = 0;
  const book = async () => { calls += 1; return { id: "new" }; };
  await assert.rejects(runOnlineBooking("offline", book), { message: OFFLINE_BOOKING_MESSAGE });
  await assert.rejects(runOnlineBooking("unknown", book), { message: OFFLINE_BOOKING_MESSAGE });
  assert.equal(calls, 0);
  assert.deepEqual(await runOnlineBooking("online", book), { id: "new" });
  assert.equal(calls, 1);
});

test("airplane-mode snapshots map to offline, and initial uncertainty stays unknown", () => {
  assert.equal(connectivityFromSnapshot({ isConnected: false, isInternetReachable: null }), "offline");
  assert.equal(connectivityFromSnapshot({ isConnected: true, isInternetReachable: false }), "offline");
  assert.equal(connectivityFromSnapshot({ isConnected: true, isInternetReachable: null }), "online");
  assert.equal(connectivityFromSnapshot({ isConnected: null, isInternetReachable: null }), "unknown");
});
