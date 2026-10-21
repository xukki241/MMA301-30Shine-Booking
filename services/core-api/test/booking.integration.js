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
    const active = calendar.appointments.filter((a) => a.status !== "cancelled");
    for (let i = 0; i < active.length; i++) {
      assert.equal(String(active[i].stylistId), String(calendar._id));
      for (let j = i + 1; j < active.length; j++) {
        assert.ok(!(active[i].startTime < active[j].endTime && active[i].endTime > active[j].startTime),
          "Persisted active appointments must not overlap");
      }
    }
  }
});
