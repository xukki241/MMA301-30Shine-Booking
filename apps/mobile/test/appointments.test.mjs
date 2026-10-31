import assert from "node:assert/strict";
import test from "node:test";

import { createDemoAppointmentDataSource } from "../src/appointments/demo-adapter.ts";

const sample = [
  { id: "booked", branchName: "Branch", serviceName: "Service", stylistName: "Stylist", startTime: "2030-01-01T10:00:00.000Z", status: "booked" },
  { id: "completed", branchName: "Branch", serviceName: "Service", stylistName: "Stylist", startTime: "2030-01-01T11:00:00.000Z", status: "completed" },
  { id: "paid", branchName: "Branch", serviceName: "Service", stylistName: "Stylist", startTime: "2030-01-01T12:00:00.000Z", status: "paid" },
  { id: "cancelled", branchName: "Branch", serviceName: "Service", stylistName: "Stylist", startTime: "2030-01-01T13:00:00.000Z", status: "cancelled" }
];

test("lists isolated appointment snapshots and supports an empty result", async () => {
  const source = createDemoAppointmentDataSource(sample);
  const first = await source.list();
  first[0].status = "paid";
  assert.equal((await source.list())[0].status, "booked");
  assert.deepEqual(await createDemoAppointmentDataSource([]).list(), []);
});

test("only booked appointments can be cancelled and cancellation stays visible", async () => {
  const source = createDemoAppointmentDataSource(sample);
  assert.equal((await source.cancel("booked")).status, "cancelled");
  assert.equal((await source.list())[0].status, "cancelled");

  for (const id of ["booked", "completed", "paid", "cancelled"]) {
    await assert.rejects(source.cancel(id), /Chỉ có thể hủy/);
  }
  await assert.rejects(source.cancel("missing"), /Không tìm thấy lịch hẹn/);
});
