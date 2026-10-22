const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const { createCalendarModel } = require("../src/models/stylist-calendar");
const { createBookingRepository } = require("../src/booking/mongo-repository");
const { parseAppointmentsQuery, parsePaymentsQuery } = require("../src/manager/query");

test("Manager Mongo reads respect Vietnam date, branch and full-filter totals", async (t) => {
  assert.ok(process.env.TEST_MONGODB_URI, "Set TEST_MONGODB_URI");
  const connection = mongoose.createConnection(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await connection.asPromise();
  const collection = `manager_test_${randomBytes(8).toString("hex")}`;
  const Calendar = createCalendarModel(connection, collection);
  t.after(async () => { await Calendar.collection.drop(); await connection.close(); });
  const repo = createBookingRepository(Calendar);
  const branchA = new mongoose.Types.ObjectId(), branchB = new mongoose.Types.ObjectId();
  const customer = new mongoose.Types.ObjectId(), service = new mongoose.Types.ObjectId();
  const make = (stylist, branch, start, status, attempts = []) => ({
    _id: new mongoose.Types.ObjectId(), customerId: customer, customerName: "Khách thử",
    customerPhone: "+84912345678", stylistId: stylist, branchId: branch, serviceId: service,
    bookedPrice: 120000, startTime: new Date(start), endTime: new Date(new Date(start).getTime() + 3600000),
    status, paymentAttempts: attempts, createdAt: new Date(), updatedAt: new Date(),
  });
  const failed = { _id: new mongoose.Types.ObjectId(), requestId: "attempt-failed", branchId: branchA,
    amount: 120000, provider: "momo", status: "failed", attemptedAt: new Date("2030-10-21T03:00:00Z") };
  const paid = { ...failed, _id: new mongoose.Types.ObjectId(), requestId: "attempt-paid",
    status: "success", attemptedAt: new Date("2030-10-21T04:00:00Z") };
  const stylistA = new mongoose.Types.ObjectId(), stylistB = new mongoose.Types.ObjectId();
  await Calendar.collection.insertMany([
    { _id: stylistA, appointments: [
      make(stylistA, branchA, "2030-10-20T16:59:59Z", "booked"),
      make(stylistA, branchA, "2030-10-20T17:00:00Z", "completed", [failed]),
      make(stylistA, branchA, "2030-10-21T02:00:00Z", "paid", [paid]),
    ] },
    { _id: stylistB, appointments: [make(stylistB, branchB, "2030-10-21T02:00:00Z", "paid", [{
      ...paid, _id: new mongoose.Types.ObjectId(), requestId: "other-branch", branchId: branchB,
    }])] },
  ]);
  const filters = { date: "2030-10-21", branchId: String(branchA), limit: "1" };
  const first = await repo.managerAppointments(parseAppointmentsQuery(filters));
  const second = await repo.managerAppointments(parseAppointmentsQuery({ ...filters, cursor: first.nextCursor }));
  assert.equal(first.items.length, 1);
  assert.equal(second.items.length, 1);
  assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal(second.nextCursor, null);
  assert.equal(first.items[0].customerPhone, undefined);
  const overview = await repo.managerOverview({ date: "2030-10-21", branchId: String(branchA) });
  assert.deepEqual(overview.counts, { booked: 0, checked_in: 0, completed: 1, paid: 1,
    cancelled: 0, no_show: 0 });
  const payments = await repo.managerPayments(parsePaymentsQuery({ branchId: String(branchA), limit: "1" }));
  assert.equal(payments.simulatedTotal, 120000);
  assert.equal(payments.items.length, 1);
  assert.ok(payments.nextCursor);
  const next = await repo.managerPayments(parsePaymentsQuery({ branchId: String(branchA), limit: "1", cursor: payments.nextCursor }));
  assert.equal(next.items[0].status, "failed");
  assert.equal(next.simulatedTotal, 120000);
});
