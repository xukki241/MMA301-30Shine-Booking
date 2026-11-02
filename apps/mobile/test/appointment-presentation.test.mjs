import assert from "node:assert/strict";
import test from "node:test";
import { selectUpcomingAppointment, selectPendingPaymentAppointment, customerAppointmentStatusLabel } from "../src/appointments/presentation.ts";

test("home only selects a future booked appointment", () => {
  const now = new Date("2026-10-22T03:58:00Z");
  const items = [
    { id: "old", status: "booked", startTime: "2026-10-22T02:30:00Z" },
    { id: "absent", status: "no_show", startTime: "2026-10-22T05:00:00Z" },
    { id: "later", status: "booked", startTime: "2026-10-23T03:00:00Z" },
    { id: "soon", status: "booked", startTime: "2026-10-22T09:00:00Z" },
  ];
  assert.equal(selectUpcomingAppointment(items, now)?.id, "soon");
  assert.equal(selectUpcomingAppointment(items.slice(0, 2), now), null);
});

test("history labels confirmed absence explicitly", () => {
  assert.equal(customerAppointmentStatusLabel("no_show"), "Bạn đã không đến");
  assert.equal(customerAppointmentStatusLabel("booked"), "Đã đặt");
  assert.equal(customerAppointmentStatusLabel("booked", "2026-10-22T02:30:00Z",
    new Date("2026-10-22T03:58:00Z")), "Chưa ghi nhận khách đến");
});

 test("home selects the latest completed appointment awaiting payment", () => {
  const items = [
    { id: "older", status: "completed", startTime: "2026-10-20T09:00:00Z" },
    { id: "paid", status: "paid", startTime: "2026-10-23T09:00:00Z" },
    { id: "latest", status: "completed", startTime: "2026-10-22T09:00:00Z" },
  ];
  assert.equal(selectPendingPaymentAppointment(items)?.id, "latest");
  assert.equal(selectPendingPaymentAppointment(items.slice(1, 2)), null);
});
