import assert from "node:assert/strict";
import test from "node:test";
import { orderCustomerAppointments } from "../src/appointments/order.ts";

test("booked appointments appear first, nearest booking first, without mutating source", () => {
  const items = [
    { id: "cancelled", status: "cancelled", startTime: "2030-10-24T09:00:00Z" },
    { id: "later", status: "booked", startTime: "2030-10-23T09:00:00Z" },
    { id: "paid", status: "paid", startTime: "2030-10-25T09:00:00Z" },
    { id: "soon", status: "booked", startTime: "2030-10-22T09:00:00Z" },
  ];
  assert.deepEqual(orderCustomerAppointments(items).map((item) => item.id),
    ["soon", "later", "paid", "cancelled"]);
  assert.equal(items[0].id, "cancelled");
});
