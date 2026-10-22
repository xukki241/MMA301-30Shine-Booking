import assert from "node:assert/strict";
import test from "node:test";
import { activeBooking, isCurrentRescheduleSlot } from "../src/booking/active-appointment.ts";

test("a customer with an upcoming booking must cancel it before booking again", () => {
  const now = new Date("2030-10-20T02:00:00Z");
  const items = [
    { id: "old", status: "completed", startTime: "2030-10-19T03:00:00Z" },
    { id: "current", status: "booked", startTime: "2030-10-20T04:20:00Z" },
  ];
  assert.equal(activeBooking(items, now)?.id, "current");
  assert.equal(activeBooking([{ ...items[1], status: "cancelled" }], now), null);
  assert.equal(activeBooking([{ ...items[1], startTime: "2030-10-19T04:20:00Z" }], now), null);
});

test("current reschedule start is unavailable even when excluded from conflict calculation", () => {
  assert.equal(isCurrentRescheduleSlot("2030-10-20T04:20:00.000Z", "2030-10-20T04:20:00Z"), true);
  assert.equal(isCurrentRescheduleSlot("2030-10-20T04:00:00.000Z", "2030-10-20T04:20:00Z"), false);
});
