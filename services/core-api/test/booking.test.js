const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { bookingContract, startHttp, id } = require("./booking-contract");
const { createApp } = require("../src/app");
const { createCalendarModel } = require("../src/models/stylist-calendar");
const { BookingError, ACTIONS, ACTIVE_STATUSES, overlaps } = require("../src/booking/rules");

// Repository double only for HTTP/service tests. This does NOT prove Mongo atomicity.
function memoryDouble() {
  const records = new Map();
  return {
    async book(data) {
      if ([...records.values()].some((r) => r.stylistId === data.stylistId &&
        ACTIVE_STATUSES.includes(r.status) && overlaps(data.startTime, data.endTime, r.startTime, r.endTime))) {
        throw new BookingError(409, "Overlap");
      }
      const appointment = { ...data, id: id(), status: "booked", paymentAttempts: [] };
      records.set(appointment.id, appointment);
      return structuredClone(appointment);
    },
    async findById(key) { return structuredClone(records.get(key) || null); },
    async transition(key, action, actor) {
      const current = records.get(key);
      const rule = ACTIONS[action];
      if (!current || current.status !== rule.from || actor.role !== rule.role ||
        current[rule.owner] !== actor.userId) return null;
      current.status = rule.to;
      if (action === "check_in") current.checkedInAt = new Date();
      if (action === "undo_check_in") delete current.checkedInAt;
      return structuredClone(current);
    },
    async recordPayment(key, actor, input) {
      const current = records.get(key);
      if (!current || current.status !== "completed" ||
          (current.customerId !== actor.userId && current.customerPhone !== actor.authorizedPhone) ||
          current.paymentAttempts.some((attempt) => attempt.requestId === input.requestId)) return null;
      const attempt = { id: id(), requestId: input.requestId, branchId: current.branchId,
        amount: current.bookedPrice, provider: input.provider, status: input.outcome,
        attemptedAt: new Date() };
      current.paymentAttempts.push(attempt);
      if (input.outcome === "success") current.status = "paid";
      return { appointment: structuredClone(current), attempt: structuredClone(attempt) };
    },
  };
}

test("SHINE-03 HTTP/service contract — test double, NOT Mongo concurrency proof", async (t) => {
  await bookingContract(t, memoryDouble());
});

test("Appointment schema rejects invalid interval/status (offline)", async () => {
  const connection = mongoose.createConnection();
  const Calendar = createCalendarModel(connection);
  const valid = {
    customerId: id(), stylistId: id(), startTime: new Date("2030-01-01T10:00:00Z"),
    endTime: new Date("2030-01-01T11:00:00Z"),
  };
  await new Calendar({ _id: valid.stylistId, appointments: [valid] }).validate();
  for (const changes of [
    { endTime: valid.startTime }, { status: "unknown" }, { customerId: undefined },
    { endTime: new Date("2030-01-01T09:00:00Z") },
  ]) {
    await assert.rejects(new Calendar({
      _id: valid.stylistId, appointments: [{ ...valid, ...changes }],
    }).validate());
  }
  await connection.close();
});

test("missing Mongo repository returns 503; no in-memory production fallback", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const base = await startHttp(t, createApp({ secret, verifyCustomer: async () => true }));
  const token = jwt.sign({ role: "customer", authVersion: 0 }, secret, { subject: id(), expiresIn: 60 });
  const response = await fetch(base + "/appointments", {
    method: "POST", headers: { Authorization: "Bearer " + token },
  });
  assert.equal(response.status, 503);
});

test("database failures return generic 500 without internal details", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const base = await startHttp(t, createApp({ secret, bookingRepository: {
    book: async () => { throw new Error("private mongo credentials"); },
  }, verifyCustomer: async () => true }));
  const token = jwt.sign({ role: "customer", authVersion: 0 }, secret, { subject: id(), expiresIn: 60 });
  const response = await fetch(base + "/appointments", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ stylistId: id(), startTime: "2030-01-01T10:00:00Z", endTime: "2030-01-01T11:00:00Z" }),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
});

test("legacy Guest session cannot access old bookings after account migration", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const oldId = id();
  const phone = "+84912345678";
  const saved = new Map();
  const repository = {
    async findById(key) { return saved.get(key) || null; },
    async listByCustomer(customerId) { return [...saved.values()].filter((a) => a.customerId === customerId); },
  };
  const appointmentId = id();
  saved.set(appointmentId, { id: appointmentId, customerId: oldId, customerPhone: phone,
    stylistId: id(), status: "booked" });
  const base = await startHttp(t, createApp(secret, repository));
  const token = jwt.sign({ role: "customer", guest: true, phone, name: "Nguyễn An", phoneVerified: true },
    secret, { subject: oldId, expiresIn: 3600 });
  for (const [path, method] of [["/appointments/customer", "GET"],
    [`/appointments/${appointmentId}/cancel`, "POST"], [`/appointments/${appointmentId}/pay`, "POST"]]) {
    assert.equal((await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}` } })).status, 401);
  }
  assert.equal(saved.size, 1, "old appointment data stays in storage");
});
