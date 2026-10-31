const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const { createCalendarModel } = require("../src/models/stylist-calendar");
const { createBookingRepository } = require("../src/booking/mongo-repository");
const { createBookingService } = require("../src/booking/service");
const { bookingContract } = require("./booking-contract");

test("SHINE-03 real Mongo atomic booking across two independent connections/app instances", async (t) => {
  assert.ok(process.env.TEST_MONGODB_URI, "Set TEST_MONGODB_URI to a real test MongoDB (SHINE-24)");
  const collection = "shine03_test_" + randomBytes(12).toString("hex");
  const connections = [0, 1].map(() => mongoose.createConnection(process.env.TEST_MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  }));
  t.after(async () => {
    try {
      const connected = connections.find((c) => c.readyState === 1);
      if (connected) {
        try { await connected.collection(collection).drop(); }
        catch (error) { if (error.code !== 26) throw error; }
      }
    } finally { await Promise.all(connections.map((c) => c.close())); }
  });
  await Promise.all(connections.map((c) => c.asPromise()));
  const calendars = connections.map((c) => createCalendarModel(c, collection));
  await Promise.all(calendars.map((c) => c.init()));
  const repositories = calendars.map(createBookingRepository);
  await bookingContract(t, ...repositories);
  const attendanceStylist = new mongoose.Types.ObjectId();
  const attendanceCustomer = new mongoose.Types.ObjectId();
  const attendanceId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const attendanceStart = new Date(Date.now() - 20 * 60000);
  await calendars[0].collection.insertOne({ _id: attendanceStylist, appointments: [{
    _id: attendanceId, customerId: attendanceCustomer, stylistId: attendanceStylist,
    startTime: attendanceStart, endTime: new Date(attendanceStart.getTime() + 45 * 60000),
    status: "booked", createdAt: new Date(), updatedAt: new Date(),
  }] });
  const attendanceService = createBookingService(repositories[0]);
  const actor = { role: "stylist", userId: String(attendanceStylist) };
  assert.equal((await attendanceService.transition(actor, String(attendanceId), "check_in")).status, "checked_in");
  assert.equal((await attendanceService.transition(actor, String(attendanceId), "undo_check_in")).status, "booked");
  assert.equal((await attendanceService.transition(actor, String(attendanceId), "no_show")).status, "no_show");
  const restored = await repositories[0].restoreNoShow(String(attendanceId),
    { role: "general_manager", userId: String(managerId) });
  assert.equal(restored.status, "checked_in");
  assert.equal(restored.statusHistory.length, 4);
  assert.equal(restored.statusHistory[3].actorRole, "general_manager");
  await attendanceService.transition(actor, String(attendanceId), "undo_check_in");
  await attendanceService.transition(actor, String(attendanceId), "no_show");
  await repositories[0].book({ customerId: String(attendanceCustomer), stylistId: String(attendanceStylist),
    startTime: attendanceStart, endTime: new Date(attendanceStart.getTime() + 45 * 60000) });
  assert.equal(await repositories[0].restoreNoShow(String(attendanceId),
    { role: "general_manager", userId: String(managerId) }), null,
  "Manager cannot restore no-show over a replacement booking");
  const legacyId = new mongoose.Types.ObjectId();
  const legacyCustomer = new mongoose.Types.ObjectId();
  const legacyStylist = new mongoose.Types.ObjectId();
  await calendars[0].collection.insertOne({ _id: legacyStylist, appointments: [{
    _id: legacyId, customerId: legacyCustomer, stylistId: legacyStylist,
    startTime: new Date("2030-11-01T10:00:00Z"), endTime: new Date("2030-11-01T11:00:00Z"),
    status: "completed", createdAt: new Date(), updatedAt: new Date(),
  }] });
  await assert.rejects(
    createBookingService(repositories[0]).pay({ role: "customer", userId: String(legacyCustomer) },
      String(legacyId), { provider: "momo", outcome: "success", requestId: "legacy-payment" }),
    (error) => error.status === 409 && /no booked price/i.test(error.message),
  );
  // Read Mongo directly to verify persistence and that no active intervals overlap.
  const docs = await calendars[0].collection.find({}).toArray();
  assert.ok(docs.length > 0);
  for (const calendar of docs) {
    const active = calendar.appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
    for (let i = 0; i < active.length; i++) {
      assert.equal(String(active[i].stylistId), String(calendar._id));
      for (let j = i + 1; j < active.length; j++) {
        assert.ok(!(active[i].startTime < active[j].endTime && active[i].endTime > active[j].startTime),
          "Persisted active appointments must not overlap");
      }
    }
  }
});
