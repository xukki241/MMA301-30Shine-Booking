const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");

const secret = "test_secret_key_32_bytes_long_123456789";
const ids = {
  stylist: "507f1f77bcf86cd799439011",
  customer1: "507f1f77bcf86cd799439012",
  customer2: "507f1f77bcf86cd799439013",
  appt1: "507f1f77bcf86cd799439014",
  appt2: "507f1f77bcf86cd799439015",
};

function sign(role, userId) {
  const claims = { sub: userId, role, authVersion: 0 };
  return jwt.sign(claims, secret, { algorithm: "HS256", expiresIn: "1h" });
}

test("Customer appointment listing endpoints", async (t) => {
  const mockAppointments = [
    {
      id: ids.appt1,
      customerId: ids.customer1,
      stylistId: ids.stylist,
      startTime: "2026-10-10T10:00:00.000Z",
      endTime: "2026-10-10T10:45:00.000Z",
      status: "booked",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: ids.appt2,
      customerId: ids.customer2,
      stylistId: ids.stylist,
      startTime: "2026-10-10T11:00:00.000Z",
      endTime: "2026-10-10T11:45:00.000Z",
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const bookingRepository = {
    async listByCustomer(customerId) {
      return mockAppointments.filter((a) => a.customerId === customerId);
    },
    async listByStylist(stylistId) {
      return mockAppointments.filter((a) => a.stylistId === stylistId);
    },
  };

  const app = createApp({ secret, bookingRepository, verifyStaff: async () => true, verifyCustomer: async () => true });
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  t.after(() => server.close());

  await t.test("GET /appointments/customer returns customer's appointments", async () => {
    const res = await fetch(`${base}/appointments/customer`, {
      headers: { Authorization: `Bearer ${sign("customer", ids.customer1)}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.appointments.length, 1);
    assert.equal(body.appointments[0].id, ids.appt1);
    assert.equal(body.appointments[0].customerId, ids.customer1);
  });

  await t.test("GET /appointments?customerId=... returns customer's appointments", async () => {
    const res = await fetch(`${base}/appointments?customerId=${ids.customer1}`, {
      headers: { Authorization: `Bearer ${sign("customer", ids.customer1)}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.appointments.length, 1);
    assert.equal(body.appointments[0].id, ids.appt1);
  });

  await t.test("Customer cannot query another customer's appointments (403)", async () => {
    const res = await fetch(`${base}/appointments?customerId=${ids.customer2}`, {
      headers: { Authorization: `Bearer ${sign("customer", ids.customer1)}` },
    });
    assert.equal(res.status, 403);
  });

  await t.test("Stylist calling /appointments/customer is rejected (403)", async () => {
    const res = await fetch(`${base}/appointments/customer`, {
      headers: { Authorization: `Bearer ${sign("stylist", ids.stylist)}` },
    });
    assert.equal(res.status, 403);
  });

  await t.test("GET /appointments/stylist returns stylist's appointments", async () => {
    const res = await fetch(`${base}/appointments/stylist?date=2026-10-10`, {
      headers: { Authorization: `Bearer ${sign("stylist", ids.stylist)}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.appointments.length, 2);
  });
});

const { createBookingService } = require("../src/booking/service");

test("customer listing finalizes an unattended appointment after its end time", async () => {
  const calls = [];
  const repository = {
    async markOverdueNoShows(customerId, now) { calls.push([customerId, now]); },
    async listByCustomer() { return [{ id: ids.appt1, status: "no_show" }]; },
  };
  const result = await createBookingService(repository).listCustomerAppointments(
    { role: "customer", userId: ids.customer1 },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ids.customer1);
  assert.ok(calls[0][1] instanceof Date);
  assert.equal(result[0].status, "no_show");
});

const { createBookingRepository } = require("../src/booking/mongo-repository");

test("repository marks only ended booked appointments for the customer", async () => {
  let operation;
  const Calendar = { updateMany(filter, update, options) { operation = { filter, update, options }; return { exec: async () => ({ modifiedCount: 1 }) }; } };
  const now = new Date("2026-11-02T12:00:00.000Z");
  await createBookingRepository(Calendar).markOverdueNoShows(ids.customer1, now);
  assert.equal(operation.filter.appointments.$elemMatch.status, "booked");
  assert.equal(String(operation.filter.appointments.$elemMatch.customerId), ids.customer1);
  assert.deepEqual(operation.options.arrayFilters[0]["overdue.endTime"], { $lte: now });
  assert.equal(operation.update.$set["appointments.$[overdue].status"], "no_show");
  assert.equal(operation.update.$push["appointments.$[overdue].statusHistory"].actorRole, "system");
});

test("repository can finalize unattended appointments across customers", async () => {
  let operation;
  const Calendar = { updateMany(filter, update, options) { operation = { filter, update, options }; return { exec: async () => ({ modifiedCount: 1 }) }; } };
  await createBookingRepository(Calendar).markOverdueNoShows();
  assert.equal(operation.filter.appointments.$elemMatch.status, "booked");
  assert.equal("customerId" in operation.filter.appointments.$elemMatch, false);
  assert.equal("overdue.customerId" in operation.options.arrayFilters[0], false);
});

test("no-show poller runs on startup and stops cleanly", async () => {
  const { createNoShowPoller } = require("../src/booking/no-show-poller");
  let runs = 0;
  let tick;
  let stopped = false;
  const poller = createNoShowPoller({ markOverdueNoShows: async () => { runs++; } }, {
    setInterval: (callback) => { tick = callback; return 1; },
    clearInterval: () => { stopped = true; },
  });
  await poller.start();
  assert.equal(runs, 1);
  await tick();
  assert.equal(runs, 2);
  poller.stop();
  assert.equal(stopped, true);
});
