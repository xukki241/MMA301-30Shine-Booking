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
      const appointment = { ...data, id: id(), status: "booked" };
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
      return structuredClone(current);
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
  const base = await startHttp(t, createApp(secret));
  const token = jwt.sign({ role: "customer" }, secret, { subject: id(), expiresIn: 60 });
  const response = await fetch(base + "/appointments", {
    method: "POST", headers: { Authorization: "Bearer " + token },
  });
  assert.equal(response.status, 503);
});

test("database failures return generic 500 without internal details", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const base = await startHttp(t, createApp(secret, {
    book: async () => { throw new Error("private mongo credentials"); },
  }));
  const token = jwt.sign({ role: "customer" }, secret, { subject: id(), expiresIn: 60 });
  const response = await fetch(base + "/appointments", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ stylistId: id(), startTime: "2030-01-01T10:00:00Z", endTime: "2030-01-01T11:00:00Z" }),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
});
