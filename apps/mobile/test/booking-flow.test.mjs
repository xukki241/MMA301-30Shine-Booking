import assert from "node:assert/strict";
import test from "node:test";
import { findSlotAtStart, mergeSlotOptions, slotForService } from "../src/booking/slot-options.ts";
import { createHttpBookingAdapter, rescheduleCustomerAppointment } from "../src/booking/http-adapter.ts";

test("schedule previews each start time once across services", () => {
  const a = { id: "a", startTime: "2030-01-01T09:00:00.000Z", endTime: "2030-01-01T09:20:00.000Z" };
  const b = { id: "b", startTime: a.startTime, endTime: "2030-01-01T09:40:00.000Z" };
  const c = { id: "c", startTime: "2030-01-01T10:00:00.000Z", endTime: "2030-01-01T10:40:00.000Z" };
  const options = mergeSlotOptions([{ serviceId: "cut", slots: [a] }, { serviceId: "wash", slots: [b, c] }]);
  assert.deepEqual(options.map((option) => option.startTime), [a.startTime, c.startTime]);
  assert.deepEqual(options[0].serviceIds, ["cut", "wash"]);
  assert.deepEqual(slotForService(options[0], "wash"), b);
  assert.equal(slotForService(options[1], "cut"), null);
});

test("service selection must recheck the chosen start time", () => {
  const slots = [{ id: "a", startTime: "2030-01-01T09:20:00.000Z", endTime: "2030-01-01T10:20:00.000Z" }];
  assert.equal(findSlotAtStart(slots, "2030-01-01T09:00:00.000Z"), null);
  assert.deepEqual(findSlotAtStart(slots, slots[0].startTime), slots[0]);
});

test("booked starts stay visible but cannot be selected", () => {
  const blocked = { id: "a", startTime: "2030-01-01T09:00:00.000Z",
    endTime: "2030-01-01T09:45:00.000Z", available: false };
  const free = { id: "b", startTime: "2030-01-01T09:30:00.000Z",
    endTime: "2030-01-01T10:15:00.000Z", available: true };
  const options = mergeSlotOptions([{ serviceId: "cut", slots: [blocked, free] }]);
  assert.equal(options.length, 2);
  assert.deepEqual(options[0].serviceIds, []);
  assert.equal(slotForService(options[0], "cut"), null);
  assert.equal(findSlotAtStart([blocked, free], blocked.startTime), null);
  assert.deepEqual(findSlotAtStart([blocked, free], free.startTime), free);
});

test("booking sends optional wishes and reschedule sends only new interval", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, json: async () => ({ appointment: {
      id: "appointment-id", status: "booked", bookedPrice: 125000,
    } }) };
  };
  const slot = { id: "slot", startTime: "2030-01-01T09:00:00Z", endTime: "2030-01-01T10:00:00Z" };
  try {
    const booking = { branch: { id: "branch" }, service: { id: "service" },
      stylist: { id: "stylist" }, date: "2030-01-01", slot };
    const result = await createHttpBookingAdapter(() => "jwt").confirmBooking(booking,
      { specialRequest: "Tư vấn tóc" });
    assert.equal(result.bookedPrice, 125000);
    assert.deepEqual(JSON.parse(calls[0].options.body).wishes, { specialRequest: "Tư vấn tóc" });
    await rescheduleCustomerAppointment("jwt", result.id, slot);
    assert.ok(calls[1].url.endsWith("/appointments/appointment-id/reschedule"));
    assert.deepEqual(JSON.parse(calls[1].options.body),
      { startTime: slot.startTime, endTime: slot.endTime });
    await rescheduleCustomerAppointment("jwt", result.id, slot, "new-service");
    assert.deepEqual(JSON.parse(calls[2].options.body),
      { startTime: slot.startTime, endTime: slot.endTime, serviceId: "new-service" });
    await createHttpBookingAdapter(() => "jwt").listTimeSlots({ branchId: "branch", serviceId: "new-service",
      stylistId: "stylist", date: "2030-01-01", excludeAppointmentId: "appointment-id" });
    assert.match(calls[3].url, /excludeAppointmentId=appointment-id/);
  } finally { globalThis.fetch = originalFetch; }
});
