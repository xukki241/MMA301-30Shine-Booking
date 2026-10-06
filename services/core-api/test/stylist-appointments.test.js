const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");

const secret = "test_secret_key_32_bytes_long_123456789";
const ids = {
  stylist: "507f1f77bcf86cd799439011",
  customer: "507f1f77bcf86cd799439012",
  appt1: "507f1f77bcf86cd799439013",
};

function sign(role, userId) {
  return jwt.sign({ sub: userId, role }, secret, { algorithm: "HS256", expiresIn: "1h" });
}

test("GET /appointments requires stylist role and returns appointments", async () => {
  const mockAppointments = [
    { id: ids.appt1, customerId: ids.customer, stylistId: ids.stylist, startTime: "2026-10-10T10:00:00.000Z", endTime: "2026-10-10T10:45:00.000Z", status: "booked" },
  ];
  const bookingRepository = {
    async listByStylist(stylistId, _date) {
      if (stylistId === ids.stylist) return mockAppointments;
      return [];
    },
  };
  const app = createApp({ secret, bookingRepository });
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  try {
    // Customer token should be rejected (403)
    const customerRes = await fetch(`${base}/appointments`, {
      headers: { Authorization: `Bearer ${sign("customer", ids.customer)}` },
    });
    assert.equal(customerRes.status, 403);

    // Stylist token should succeed (200)
    const stylistRes = await fetch(`${base}/appointments?date=2026-10-10`, {
      headers: { Authorization: `Bearer ${sign("stylist", ids.stylist)}` },
    });
    assert.equal(stylistRes.status, 200);
    const body = await stylistRes.json();
    assert.equal(body.appointments.length, 1);
    assert.equal(body.appointments[0].id, ids.appt1);
  } finally {
    server.close();
  }
});
