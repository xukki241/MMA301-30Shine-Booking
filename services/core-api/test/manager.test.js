const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { startHttp, id } = require("./booking-contract");
const { dayRange, parseAppointmentsQuery, parsePaymentsQuery } = require("../src/manager/query");

test("Manager day range uses Vietnam midnight", () => {
  assert.deepEqual(dayRange("2030-10-21").map((date) => date.toISOString()),
    ["2030-10-20T17:00:00.000Z", "2030-10-21T17:00:00.000Z"]);
  assert.throws(() => dayRange("2030-02-30"), /date/i);
});

test("Manager query rejects malformed filters and requires branch for payment", () => {
  assert.throws(() => parseAppointmentsQuery({ limit: "0" }), /limit/i);
  assert.throws(() => parseAppointmentsQuery({ branchId: "bad" }), /branchId/i);
  assert.throws(() => parsePaymentsQuery({}), /branchId/i);
  assert.throws(() => parsePaymentsQuery({ branchId: id(), from: "2030-10-22", to: "2030-10-21" }), /range/i);
});

test("Manager endpoints reject other roles and revoked staff", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const repository = {
    managerOverview: async () => ({ date: "2030-10-21", counts: { booked: 1, completed: 0, paid: 0, cancelled: 0 } }),
    managerAppointments: async () => ({ items: [], nextCursor: null }),
    managerAppointment: async () => null,
    managerPayments: async () => ({ items: [], nextCursor: null, simulatedTotal: 0 }),
  };
  const base = await startHttp(t, createApp({ secret, bookingRepository: repository,
    verifyStaff: async (_token, payload) => payload.sub !== "000000000000000000000001", verifyCustomer: async () => true }));
  const token = (role, subject = id()) => jwt.sign({ role, authVersion: 0 }, secret, { subject, expiresIn: 3600 });
  for (const role of ["customer", "stylist", "system_admin"]) {
    assert.equal((await fetch(base + "/manager/overview", { headers: { Authorization: `Bearer ${token(role)}` } })).status, 403);
  }
  assert.equal((await fetch(base + "/manager/overview", { headers: { Authorization: `Bearer ${token("general_manager")}` } })).status, 200);
  assert.equal((await fetch(base + "/manager/overview", { headers: { Authorization: `Bearer ${token("general_manager", "000000000000000000000001")}` } })).status, 401);
});
