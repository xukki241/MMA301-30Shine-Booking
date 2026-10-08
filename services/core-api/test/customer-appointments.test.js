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
  return jwt.sign({ sub: userId, role }, secret, { algorithm: "HS256", expiresIn: "1h" });
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

  const app = createApp({ secret, bookingRepository });
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
