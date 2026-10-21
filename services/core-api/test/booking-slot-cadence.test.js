const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSlotOptions, createWorkShiftRepository } = require("../src/work-shifts/repository");

test("45 minute service starts every 45 minutes and occupied intervals remain disabled", () => {
  const shift = { startAt: new Date("2030-10-20T02:00:00Z"), endAt: new Date("2030-10-20T04:30:00Z") };
  const appointment = { startTime: new Date("2030-10-20T02:00:00Z"),
    endTime: new Date("2030-10-20T02:45:00Z"), status: "booked" };
  const slots = buildSlotOptions([shift], [appointment], 45, new Date("2020-01-01T00:00:00Z"));
  assert.deepEqual(slots.map((slot) => [slot.startTime.toISOString(), slot.available]), [
    ["2030-10-20T02:00:00.000Z", false],
    ["2030-10-20T02:45:00.000Z", true],
    ["2030-10-20T03:30:00.000Z", true],
  ]);
  assert.equal(slots.some((slot) => slot.startTime.toISOString() === "2030-10-20T02:30:00.000Z"), false);
  assert.equal(buildSlotOptions([shift], [{ ...appointment, status: "cancelled" }], 45,
    new Date("2020-01-01T00:00:00Z"))[0].available, true);
  const shifted = { startAt: new Date("2030-10-20T02:15:00Z"), endAt: shift.endAt };
  assert.equal(buildSlotOptions([shifted], [], 45,
    new Date("2020-01-01T00:00:00Z"))[0].startTime.toISOString(), "2030-10-20T02:15:00.000Z");
});

test("a 45 minute service can start and be booked at 10:00 when a 09:00 booking ends at 10:00", async () => {
  const shift = { startAt: new Date("2030-10-20T02:00:00Z"), endAt: new Date("2030-10-20T05:00:00Z") };
  const appointment = { id: "other", startTime: new Date("2030-10-20T02:00:00Z"),
    endTime: new Date("2030-10-20T03:00:00Z"), status: "booked" };
  const slots = buildSlotOptions([shift], [appointment], 45, new Date("2020-01-01T00:00:00Z"));
  assert.deepEqual(slots.slice(0, 4).map((slot) => [slot.startTime.toISOString(), slot.available]), [
    ["2030-10-20T02:00:00.000Z", false],
    ["2030-10-20T02:45:00.000Z", false],
    ["2030-10-20T03:00:00.000Z", true],
    ["2030-10-20T03:45:00.000Z", true],
  ]);
  const branchId = "a".repeat(24), serviceId = "b".repeat(24), stylistId = "c".repeat(24);
  const found = (value) => ({ lean: () => ({ exec: async () => value }) });
  const repository = createWorkShiftRepository({
    Branch: { findById: () => found({ name: "Salon", address: "Hà Nội" }) },
    Service: { findOne: () => found({ name: "Cắt tóc", durationMinutes: 45, price: 60000 }) },
    StylistProfile: { findOne: () => found({ displayName: "Toàn" }) },
    WorkShift: { findOne: () => found({ ...shift, branchId }) },
    Calendar: { findById: () => found({ appointments: [appointment] }) },
  });
  const request = { branchId, serviceId, stylistId, startTime: new Date("2030-10-20T03:00:00Z"),
    endTime: new Date("2030-10-20T03:45:00Z") };
  assert.equal((await repository.validateBooking(request)).bookedPrice, 60000);
  await assert.rejects(repository.validateBooking({ ...request,
    startTime: new Date("2030-10-20T02:45:00Z"), endTime: new Date("2030-10-20T03:30:00Z") }),
  { status: 409 });
});

test("rescheduling ignores only the customer's own appointment", () => {
  const shift = { startAt: new Date("2030-10-20T02:00:00Z"), endAt: new Date("2030-10-20T04:30:00Z") };
  const mine = { id: "mine", startTime: new Date("2030-10-20T02:00:00Z"),
    endTime: new Date("2030-10-20T02:45:00Z"), status: "booked" };
  const another = { id: "another", startTime: new Date("2030-10-20T03:30:00Z"),
    endTime: new Date("2030-10-20T04:00:00Z"), status: "booked" };
  const slots = buildSlotOptions([shift], [mine, another], 45, new Date("2020-01-01T00:00:00Z"), "mine");
  assert.deepEqual(slots.map((slot) => slot.available), [true, true, false]);
});

test("only the appointment owner can exclude it from available slots", async () => {
  const branchId = "a".repeat(24), serviceId = "b".repeat(24), stylistId = "c".repeat(24);
  const appointmentId = "d".repeat(24), customerId = "e".repeat(24);
  const appointment = { _id: appointmentId, customerId, branchId, status: "booked",
    startTime: new Date("2030-10-20T02:00:00Z"), endTime: new Date("2030-10-20T02:45:00Z") };
  const repository = createWorkShiftRepository({
    Branch: { findById: async () => ({ name: "Salon" }) },
    Service: { findOne: async () => ({ durationMinutes: 45 }) },
    StylistProfile: { findOne: async () => ({ displayName: "Stylist" }) },
    WorkShift: { find: () => ({ sort: () => ({ lean: () => ({ exec: async () => [{
      startAt: new Date("2030-10-20T02:00:00Z"), endAt: new Date("2030-10-20T04:00:00Z"),
    }] }) }) }) },
    Calendar: { findById: () => ({ lean: () => ({ exec: async () => ({ appointments: [appointment] }) }) }) },
  });
  const query = { branchId, serviceId, stylistId, date: "2030-10-20", excludeAppointmentId: appointmentId };
  const slots = await repository.availableSlots(query, { role: "customer", userId: customerId });
  assert.equal(slots[1].available, true);
  await assert.rejects(repository.availableSlots(query, { role: "customer", userId: "f".repeat(24) }),
    { status: 403 });
});
