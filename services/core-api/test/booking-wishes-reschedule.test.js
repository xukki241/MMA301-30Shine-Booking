const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBooking, validateReschedule } = require("../src/booking/rules");
const { createBookingService } = require("../src/booking/service");
const { createApp } = require("../src/app");
const jwt = require("jsonwebtoken");
const { once } = require("node:events");

const id = "a".repeat(24);
const booking = { stylistId: id, branchId: id, serviceId: id,
  startTime: "2030-10-20T10:00:00Z", endTime: "2030-10-20T11:00:00Z" };

test("booking accepts bounded optional wishes and rejects oversized input", () => {
  const wishes = { stylistPreference: "Ưu tiên stylist có kinh nghiệm", specialRequest: "Tư vấn kiểu tóc",
    referenceImages: ["data:image/jpeg;base64,/9j/4AAQ"] };
  assert.deepEqual(validateBooking({ ...booking, wishes }).wishes, wishes);
  assert.throws(() => validateBooking({ ...booking, wishes: { ...wishes,
    referenceImages: Array(4).fill(wishes.referenceImages[0]) } }), /Invalid booking wishes/);
  assert.throws(() => validateBooking({ ...booking, wishes: { specialRequest: "x".repeat(501) } }), /Invalid booking wishes/);
});

test("booking stores catalog names from server snapshot, not client input", async () => {
  let saved;
  const service = createBookingService({ book: async (data) => { saved = data; return data; } });
  await service.book({ role: "customer", userId: "b".repeat(24) }, booking,
    { branchName: "30Shine Cầu Diễn", branchAddress: "65 Cầu Diễn, Hà Nội",
      serviceName: "Cắt xả", stylistName: "Anh Phú", bookedPrice: 103000 });
  assert.equal(saved.serviceName, "Cắt xả");
  assert.equal(saved.stylistName, "Anh Phú");
  assert.throws(() => validateBooking({ ...booking, serviceName: "Shine Combo 10 bước" }), /Expected stylistId/);
});

test("reschedule only accepts an explicit new time interval", () => {
  assert.equal(validateReschedule({ startTime: booking.startTime, endTime: booking.endTime }).startTime.toISOString(),
    "2030-10-20T10:00:00.000Z");
  assert.throws(() => validateReschedule({ startTime: booking.startTime, endTime: booking.endTime,
    stylistId: id }), /Invalid reschedule request/);
});

test("reschedule enforces ownership, state and shift; preserves appointment identity", async () => {
  const record = { id, customerId: "b".repeat(24), stylistId: id, branchId: id, serviceId: id,
    startTime: new Date("2030-10-20T10:00:00Z"), endTime: new Date("2030-10-20T11:00:00Z"),
    status: "booked", wishes: { specialRequest: "Tư vấn kiểu tóc" } };
  let validated = 0;
  const service = createBookingService({ findById: async () => record,
    reschedule: async (_id, actor, times) => {
      assert.equal(actor.userId, record.customerId);
      return { ...record, ...times };
    } });
  const shift = { validateBooking: async ({ branchId, serviceId }) => {
    assert.equal(branchId, id); assert.equal(serviceId, id); validated++;
  } };
  const newTime = { startTime: "2030-10-21T10:00:00Z", endTime: "2030-10-21T11:00:00Z" };
  await assert.rejects(service.reschedule({ role: "customer", userId: "c".repeat(24) }, id, newTime, shift),
    { status: 403 });
  const updated = await service.reschedule({ role: "customer", userId: record.customerId }, id, newTime, shift);
  assert.equal(updated.id, id); assert.equal(updated.wishes.specialRequest, "Tư vấn kiểu tóc");
  assert.equal(updated.startTime.toISOString(), "2030-10-21T10:00:00.000Z");
  assert.equal(validated, 1);
  record.status = "cancelled";
  await assert.rejects(service.reschedule({ role: "customer", userId: record.customerId }, id, newTime, shift),
    { status: 400 });
});

test("customer reschedule endpoint validates the new slot and returns the updated appointment", async (t) => {
  const customerId = "b".repeat(24);
  const record = { id, customerId, stylistId: id, branchId: id, serviceId: id,
    startTime: new Date("2030-10-20T10:00:00Z"), endTime: new Date("2030-10-20T11:00:00Z"), status: "booked" };
  const app = createApp({ secret: "test-secret", verifyCustomer: async () => true,
    workShiftRepository: { validateBooking: async () => ({ bookedPrice: 100000 }) },
    bookingRepository: { findById: async () => record, reschedule: async (_id, _actor, times) => ({ ...record, ...times }) } });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const token = jwt.sign({ role: "customer", authVersion: 0 }, "test-secret",
    { subject: customerId, expiresIn: 3600, algorithm: "HS256" });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/appointments/${id}/reschedule`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ startTime: "2030-10-21T10:00:00Z", endTime: "2030-10-21T11:00:00Z" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).appointment.startTime, "2030-10-21T10:00:00.000Z");
});
