const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { createBranchModel } = require("../src/models/branch.model");
const { createServiceModel } = require("../src/models/service.model");
const { createStylistModel } = require("../src/models/stylist.model");
const { createCalendarModel } = require("../src/models/stylist-calendar");
const { createWorkShiftModel } = require("../src/models/work-shift.model");
const { createWorkShiftRepository } = require("../src/work-shifts/repository");
const { BookingError } = require("../src/booking/rules");

const uri = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/shine_core_test";

test("Work Shift repository persists local-day shifts and computes appointment-aware slots", async (t) => {
  const suffix = randomBytes(8).toString("hex");
  const collections = {
    branches: `test_shift_branches_${suffix}`,
    services: `test_shift_services_${suffix}`,
    stylists: `test_shift_stylists_${suffix}`,
    calendars: `test_shift_calendars_${suffix}`,
    shifts: `test_work_shifts_${suffix}`,
  };
  const connection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 });
  t.after(async () => {
    try {
      if (connection.readyState === 1) {
        for (const collection of Object.values(collections)) await connection.collection(collection).drop().catch(() => {});
      }
    } finally { await connection.close(); }
  });
  await connection.asPromise();

  const Branch = createBranchModel(connection, collections.branches);
  const Service = createServiceModel(connection, collections.services);
  const StylistProfile = createStylistModel(connection, collections.stylists);
  const Calendar = createCalendarModel(connection, collections.calendars);
  const WorkShift = createWorkShiftModel(connection, collections.shifts);
  await Promise.all([Branch.init(), Service.init(), StylistProfile.init(), Calendar.init(), WorkShift.init()]);

  const branch = await Branch.create({ name: "Test branch", address: "123 Integration Street" });
  const userId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const service = await Service.create({ branchId: branch.id, name: "Test cut", price: 10, durationMinutes: 45 });
  await StylistProfile.create({ userId, branchId: branch.id, displayName: "Test stylist" });
  const repository = createWorkShiftRepository({ Branch, Service, StylistProfile, WorkShift, Calendar });
  const body = {
    branchId: String(branch.id), stylistId: String(userId), date: "2030-10-20",
    startAt: "2030-10-20T09:00:00+07:00", endAt: "2030-10-20T13:00:00+07:00",
  };
  const secret = randomBytes(32).toString("hex");
  const app = createApp({ secret, models: { Branch, Service, StylistProfile, Calendar, WorkShift },
    verifyStaff: async () => true, verifyCustomer: async () => true, verifyActiveStylist: async () => true });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const bearer = (role, sub) => `Bearer ${jwt.sign({ sub: String(sub), role, authVersion: 0 },
    secret, { algorithm: "HS256", expiresIn: 3600 })}`;
  const adminHeaders = { Authorization: bearer("general_manager", new mongoose.Types.ObjectId()), "Content-Type": "application/json" };
  const customerHeaders = { Authorization: bearer("customer", customerId), "Content-Type": "application/json" };

  const createResponse = await fetch(`${base}/work-shifts`, { method: "POST", headers: adminHeaders, body: JSON.stringify(body) });
  assert.equal(createResponse.status, 201);
  const { workShift: shift } = await createResponse.json();
  assert.equal(shift.date, body.date);
  assert.equal((await repository.list({ branchId: body.branchId, stylistId: body.stylistId, date: body.date })).length, 1);
  const duplicateResponse = await fetch(`${base}/work-shifts`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ ...body, startAt: "2030-10-20T11:00:00+07:00", endAt: "2030-10-20T13:00:00+07:00" }) });
  assert.equal(duplicateResponse.status, 409);

  const initialSlots = await repository.availableSlots({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, date: body.date });
  assert.equal(initialSlots.length, 13);
  assert.equal(initialSlots[0].startTime, "2030-10-20T02:00:00.000Z");
  const slotResponse = await fetch(`${base}/time-slots?branchId=${body.branchId}&serviceId=${service.id}&stylistId=${userId}&date=${body.date}`, { headers: customerHeaders });
  assert.equal(slotResponse.status, 200);
  assert.equal((await slotResponse.json()).slots.length, 13);
  const bookingResponse = await fetch(`${base}/appointments`, { method: "POST", headers: customerHeaders, body: JSON.stringify({ branchId: body.branchId, serviceId: String(service.id), stylistId: String(userId), startTime: initialSlots[3].startTime, endTime: initialSlots[3].endTime }) });
  assert.equal(bookingResponse.status, 201);
  const booked = (await bookingResponse.json()).appointment;

  const available = await repository.availableSlots({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, date: body.date });
  assert.equal(available.length, 13);
  assert.equal(available[3].available, false);
  assert.equal(available[1].available, false);
  const moveResponse = await fetch(`${base}/appointments/${booked.id}/reschedule`, { method: "POST", headers: customerHeaders,
    body: JSON.stringify({ startTime: initialSlots[7].startTime, endTime: initialSlots[7].endTime }) });
  assert.equal(moveResponse.status, 200);
  assert.equal((await moveResponse.json()).appointment.startTime, initialSlots[7].startTime);
  const afterMove = await repository.availableSlots({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, date: body.date });
  assert.equal(afterMove[3].available, true, "10:00 is released after moving to 11:20");
  assert.equal(afterMove[4].available, true, "10:20 no longer overlaps the booking");
  assert.equal(afterMove[5].available, false, "10:40 would overlap an 11:20 appointment by five minutes");
  assert.equal(afterMove[6].available, false, "11:00 overlaps the new appointment");
  assert.equal(afterMove[7].available, false, "11:20 is occupied after the move");
  const otherHeaders = { Authorization: bearer("customer", new mongoose.Types.ObjectId()), "Content-Type": "application/json" };
  const otherBooking = await fetch(`${base}/appointments`, { method: "POST", headers: otherHeaders,
    body: JSON.stringify({ branchId: body.branchId, serviceId: String(service.id), stylistId: String(userId),
      startTime: initialSlots[3].startTime, endTime: initialSlots[3].endTime }) });
  assert.equal(otherBooking.status, 201, "another customer can book the released old start");
  await repository.validateBooking({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, startTime: new Date(initialSlots[0].startTime), endTime: new Date(initialSlots[0].endTime) });
  await Service.collection.updateOne({ _id: service._id }, { $set: { price: 10.5 } });
  await assert.rejects(repository.validateBooking({ branchId: body.branchId, serviceId: String(service.id),
    stylistId: body.stylistId, startTime: new Date(initialSlots[0].startTime), endTime: new Date(initialSlots[0].endTime) }),
  (error) => error instanceof BookingError && error.status === 409);
  await Service.collection.updateOne({ _id: service._id }, { $set: { price: 10 } });
  await assert.rejects(repository.validateBooking({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, startTime: new Date(initialSlots[0].startTime), endTime: new Date(new Date(initialSlots[0].startTime).getTime() + 30 * 60000) }), (error) => error instanceof BookingError && error.status === 409);
  await assert.rejects(repository.validateBooking({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, startTime: new Date("2030-10-20T02:15:00Z"), endTime: new Date("2030-10-20T03:00:00Z") }), (error) => error instanceof BookingError && error.status === 409);

  await assert.rejects(repository.update(shift.id, { ...body, startAt: "2030-10-20T10:30:00+07:00" }), (error) => error instanceof BookingError && error.status === 409);
  await assert.rejects(repository.remove(shift.id), (error) => error instanceof BookingError && error.status === 409);
  await Calendar.updateOne({ _id: userId }, { $set: { "appointments.0.status": "cancelled", "appointments.1.status": "cancelled" } });
  assert.equal((await repository.availableSlots({ branchId: body.branchId, serviceId: String(service.id), stylistId: body.stylistId, date: body.date })).length, 13);
  const updateResponse = await fetch(`${base}/work-shifts/${shift.id}`, { method: "PUT", headers: adminHeaders, body: JSON.stringify({ ...body, endAt: "2030-10-20T11:30:00+07:00" }) });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).workShift.endAt, "2030-10-20T04:30:00.000Z");
  const deleteResponse = await fetch(`${base}/work-shifts/${shift.id}`, { method: "DELETE", headers: adminHeaders });
  assert.equal(deleteResponse.status, 200);
  assert.equal((await repository.list({ branchId: body.branchId, stylistId: body.stylistId, date: body.date })).length, 0);
});
