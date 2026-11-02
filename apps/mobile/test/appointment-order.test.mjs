import assert from "node:assert/strict";
import test from "node:test";
import { filterCustomerAppointments, isValidLookupDate, orderCustomerAppointments } from "../src/appointments/order.ts";

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

test("appointments awaiting payment appear before booked and past appointments", () => {
  const items = [
    { id: "cancelled", status: "cancelled", startTime: "2030-10-26T09:00:00Z" },
    { id: "older-payment", status: "completed", startTime: "2030-10-20T09:00:00Z" },
    { id: "booked", status: "booked", startTime: "2030-10-22T09:00:00Z" },
    { id: "newer-payment", status: "completed", startTime: "2030-10-21T09:00:00Z" },
  ];
  assert.deepEqual(orderCustomerAppointments(items).map((item) => item.id),
    ["newer-payment", "older-payment", "booked", "cancelled"]);
});

test("lookup filters own appointments by service, salon, or stylist without accents", () => {
  const items = [
    { id: "a", status: "paid", startTime: "2030-10-20T09:00:00Z", serviceName: "Cắt tóc", branchName: "30Shine Phú Diễn", stylistName: "Nguyễn Anh Tuấn" },
    { id: "b", status: "booked", startTime: "2030-10-21T09:00:00Z", serviceName: "Nhuộm tóc", branchName: "30Shine Hòa Lạc", stylistName: "Trần Bình" },
  ];
  assert.deepEqual(filterCustomerAppointments(items, "phu dien").map((item) => item.id), ["a"]);
  assert.deepEqual(filterCustomerAppointments(items, "cat toc").map((item) => item.id), ["a"]);
  assert.deepEqual(filterCustomerAppointments(items, "tran binh").map((item) => item.id), ["b"]);
  assert.equal(filterCustomerAppointments(items, "không có").length, 0);
  assert.equal(filterCustomerAppointments(items, " ").length, 2);
});

test("lookup filters by Vietnam calendar day and combines date with keyword", () => {
  const items = [
    { id: "a", status: "paid", startTime: "2026-11-01T17:30:00Z", serviceName: "Cắt tóc" },
    { id: "b", status: "paid", startTime: "2026-11-02T17:30:00Z", serviceName: "Cắt tóc" },
    { id: "c", status: "paid", startTime: "2026-11-02T09:00:00Z", serviceName: "Nhuộm tóc" },
  ];
  assert.deepEqual(filterCustomerAppointments(items, "", "02/11/2026").map((item) => item.id), ["a", "c"]);
  assert.deepEqual(filterCustomerAppointments(items, "cat toc", "02/11/2026").map((item) => item.id), ["a"]);
  assert.equal(isValidLookupDate("31/02/2026"), false);
  assert.equal(isValidLookupDate("02/11/2026"), true);
});
