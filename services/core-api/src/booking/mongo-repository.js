const mongoose = require("mongoose");
const { ACTIVE_STATUSES, ACTIONS, BookingError } = require("./rules");
const { dayRange, encodeCursor } = require("../manager/query");

function cursorMatch(field, cursor) {
  if (!cursor) return {};
  return { $or: [
    { [field]: { $lt: cursor.time } },
    { [field]: cursor.time, _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
  ] };
}

function paged(rows, limit, timeField) {
  const items = rows.slice(0, limit).map((row) => ({ ...row, id: String(row._id), _id: undefined }));
  const last = rows.length > limit ? rows[limit - 1] : null;
  return { items, nextCursor: last ? encodeCursor(last[timeField], last._id) : null };
}

function plain(appointment) {
  return {
    id: String(appointment._id),
    customerId: String(appointment.customerId),
    ...(appointment.customerName ? { customerName: appointment.customerName } : {}),
    ...(appointment.customerPhone ? { customerPhone: appointment.customerPhone } : {}),
    stylistId: String(appointment.stylistId),
    ...(appointment.branchId ? { branchId: String(appointment.branchId) } : {}),
    ...(appointment.branchName ? { branchName: appointment.branchName } : {}),
    ...(appointment.branchAddress ? { branchAddress: appointment.branchAddress } : {}),
    ...(appointment.serviceId ? { serviceId: String(appointment.serviceId) } : {}),
    ...(appointment.serviceName ? { serviceName: appointment.serviceName } : {}),
    ...(appointment.stylistName ? { stylistName: appointment.stylistName } : {}),
    ...(typeof appointment.bookedPrice === "number" ? { bookedPrice: appointment.bookedPrice } : {}),
    ...(appointment.wishes ? { wishes: appointment.wishes } : {}),
    paymentAttempts: (appointment.paymentAttempts || []).map((attempt) => ({
      id: String(attempt._id), requestId: attempt.requestId,
      branchId: String(attempt.branchId), amount: attempt.amount,
      provider: attempt.provider, status: attempt.status, attemptedAt: attempt.attemptedAt,
    })),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    ...(appointment.checkedInAt ? { checkedInAt: appointment.checkedInAt } : {}),
    ...(appointment.checkedInBy ? { checkedInBy: String(appointment.checkedInBy) } : {}),
    ...(appointment.noShowAt ? { noShowAt: appointment.noShowAt } : {}),
    ...(appointment.noShowBy ? { noShowBy: String(appointment.noShowBy) } : {}),
    statusHistory: (appointment.statusHistory || []).map((entry) => ({ from: entry.from, to: entry.to,
      actorId: entry.actorId ? String(entry.actorId) : undefined, actorRole: entry.actorRole, at: entry.at })),
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

function createBookingRepository(Calendar) {
  return {
    async book(data) {
      const now = new Date();
      const appointment = {
        ...data, _id: new mongoose.Types.ObjectId(), status: "booked",
        createdAt: now, updatedAt: now,
      };
      // Only bootstrap an empty document using indexed _id. Never upsert the overlap filter.
      try {
        await Calendar.updateOne({ _id: data.stylistId }, {
          $setOnInsert: { appointments: [] },
        }, { upsert: true }).exec();
      } catch (error) {
        if (error.code !== 11000) throw error; // Another request bootstrapped this stylist.
      }
      const calendar = await Calendar.findOneAndUpdate({
        _id: data.stylistId,
        appointments: { $not: { $elemMatch: {
          status: { $in: ACTIVE_STATUSES },
          startTime: { $lt: data.endTime },
          endTime: { $gt: data.startTime },
        } } },
      }, {
        $push: { appointments: appointment },
      }, {
        returnDocument: "after", runValidators: true,
        projection: { appointments: { $elemMatch: { _id: appointment._id } } },
      }).lean().exec();
      if (!calendar) throw new BookingError(409, "Stylist already has an overlapping appointment");
      return plain(calendar.appointments[0]);
    },

    async findById(id) {
      const calendar = await Calendar.findOne({ "appointments._id": id }, {
        appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } },
      }).lean().exec();
      return calendar ? plain(calendar.appointments[0]) : null;
    },

    async listByStylist(stylistId, date) {
      if (!mongoose.Types.ObjectId.isValid(stylistId)) return [];
      const calendar = await Calendar.findById(stylistId).lean().exec();
      if (!calendar || !calendar.appointments) return [];
      let list = calendar.appointments.map(plain);
      if (date) {
        list = list.filter((a) => {
          const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(a.startTime));
          return localDate === date;
        });
      }
      return list;
    },

    async listByCustomer(customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) return [];
      const calendars = await Calendar.find({
        "appointments.customerId": new mongoose.Types.ObjectId(customerId),
      }).lean().exec();
      const list = [];
      for (const cal of calendars) {
        if (cal.appointments) {
          for (const appt of cal.appointments) {
            if (String(appt.customerId) === String(customerId)) {
              list.push(plain(appt));
            }
          }
        }
      }
      list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      return list;
    },

    /**
     * Return all booked/checked-in/completed appointments for a stylist on a given date.
     * Used by work-shift service to compute available time slots.
     * @param {string} stylistId - lowercase hex ObjectId string
     * @param {string} date - "YYYY-MM-DD" local date
     */
    async getActiveAppointmentsForStylistDate(stylistId, date) {
      // We filter by date range: midnight to end of day in UTC.
      // The date param is a local date string; to be safe we query a full UTC day ± 1 day
      // so we don't miss appointments due to timezone differences.
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      dayStart.setUTCDate(dayStart.getUTCDate() - 1); // start from day-1 in UTC
      const dayEnd = new Date(`${date}T00:00:00.000Z`);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 2); // up to day+2 in UTC

      const calendar = await Calendar.findOne(
        { _id: new mongoose.Types.ObjectId(stylistId) },
        {
          appointments: {
            $filter: {
              input: "$appointments",
              as: "appt",
              cond: {
                $and: [
                  { $in: ["$$appt.status", ACTIVE_STATUSES.filter((s) => s !== "paid")] },
                  { $lt: ["$$appt.startTime", dayEnd] },
                  { $gt: ["$$appt.endTime", dayStart] },
                ],
              },
            },
          },
        }
      ).lean().exec();

      if (!calendar || !calendar.appointments) return [];
      return calendar.appointments.map((a) => ({
        id: String(a._id),
        stylistId,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
      }));
    },

    async transition(id, action, actor) {
      const rule = ACTIONS[action];
      if (!rule || actor.role !== rule.role) throw new BookingError(403, "Action not permitted");
      // Compare-and-set prevents concurrent transitions from overwriting a new state.
      const owner = { [rule.owner]: actor.userId };
      const now = actor.now || new Date();
      const calendar = await Calendar.findOneAndUpdate({
        appointments: { $elemMatch: {
          _id: id, status: rule.from, ...owner,
          ...(action === "undo_check_in" ? { checkedInAt: { $gte: new Date(now.getTime() - 5 * 60000) } } : {}),
          ...(action === "no_show" ? { startTime: { $lte: new Date(now.getTime() - 15 * 60000) } } : {}),
          ...(action === "cancel" ? { startTime: { $gt: now } } : {}),
        } },
      }, { $set: {
        "appointments.$.status": rule.to,
        "appointments.$.updatedAt": now,
        ...(action === "check_in" ? { "appointments.$.checkedInAt": now,
          "appointments.$.checkedInBy": actor.userId } : {}),
        ...(action === "no_show" ? { "appointments.$.noShowAt": now,
          "appointments.$.noShowBy": actor.userId } : {}),
      }, $push: { "appointments.$.statusHistory": { from: rule.from, to: rule.to,
        actorId: actor.userId, actorRole: actor.role, at: now } },
        ...(action === "undo_check_in" ? { $unset: { "appointments.$.checkedInAt": "",
          "appointments.$.checkedInBy": "" } } : {}) }, {
        returnDocument: "after", runValidators: true,
        projection: { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } },
      }).lean().exec();
      return calendar ? plain(calendar.appointments[0]) : null;
    },

    async restoreNoShow(id, actor) {
      const now = new Date();
      const original = await this.findById(id);
      if (!original || original.status !== "no_show") return null;
      const calendar = await Calendar.findOneAndUpdate({ $and: [
        { appointments: { $elemMatch: { _id: id, status: "no_show" } } },
        { appointments: { $not: { $elemMatch: { _id: { $ne: new mongoose.Types.ObjectId(id) },
          status: { $in: ACTIVE_STATUSES }, startTime: { $lt: original.endTime },
          endTime: { $gt: original.startTime } } } } },
      ] }, { $set: { "appointments.$[target].status": "checked_in",
        "appointments.$[target].checkedInAt": now, "appointments.$[target].checkedInBy": actor.userId,
        "appointments.$[target].updatedAt": now },
      $push: { "appointments.$[target].statusHistory": { from: "no_show", to: "checked_in",
        actorId: actor.userId, actorRole: actor.role, at: now } } }, {
        returnDocument: "after", runValidators: true,
        arrayFilters: [{ "target._id": new mongoose.Types.ObjectId(id), "target.status": "no_show" }],
        projection: { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } },
      }).lean().exec();
      return calendar ? plain(calendar.appointments[0]) : null;
    },

    async reschedule(id, actor, { startTime, endTime, serviceId, serviceName, bookedPrice }) {
      const calendar = await Calendar.findOneAndUpdate({
        _id: new mongoose.Types.ObjectId(actor.stylistId),
        $and: [
          { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id),
            status: "booked", customerId: new mongoose.Types.ObjectId(actor.userId) } } },
          { appointments: { $not: { $elemMatch: {
            _id: { $ne: new mongoose.Types.ObjectId(id) }, status: { $in: ACTIVE_STATUSES },
            startTime: { $lt: endTime }, endTime: { $gt: startTime },
          } } } },
        ],
      }, { $set: { "appointments.$[target].startTime": startTime,
        "appointments.$[target].endTime": endTime, "appointments.$[target].updatedAt": new Date(),
        ...(serviceId ? { "appointments.$[target].serviceId": new mongoose.Types.ObjectId(serviceId) } : {}),
        ...(serviceName ? { "appointments.$[target].serviceName": serviceName } : {}),
        ...(bookedPrice !== undefined ? { "appointments.$[target].bookedPrice": bookedPrice } : {}) } }, {
        returnDocument: "after", runValidators: true,
        arrayFilters: [{ "target._id": new mongoose.Types.ObjectId(id), "target.status": "booked" }],
        projection: { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } },
      }).lean().exec();
      return calendar ? plain(calendar.appointments[0]) : null;
    },

    async recordPayment(id, actor, input, appointment) {
      const attempt = {
        _id: new mongoose.Types.ObjectId(), requestId: input.requestId,
        branchId: appointment.branchId, amount: appointment.bookedPrice,
        provider: input.provider, status: input.outcome, attemptedAt: new Date(),
      };
      const owner = { customerId: actor.userId };
      const calendar = await Calendar.findOneAndUpdate({ appointments: { $elemMatch: {
        _id: id, status: "completed", bookedPrice: { $exists: true },
        "paymentAttempts.requestId": { $ne: input.requestId }, ...owner,
      } } }, {
        $push: { "appointments.$.paymentAttempts": attempt },
        $set: { "appointments.$.updatedAt": new Date(),
          ...(input.outcome === "success" ? { "appointments.$.status": "paid" } : {}) },
      }, {
        returnDocument: "after", runValidators: true,
        projection: { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } },
      }).lean().exec();
      if (!calendar) return null;
      const result = plain(calendar.appointments[0]);
      return { appointment: result, attempt: result.paymentAttempts.find((item) => item.requestId === input.requestId) };
    },

    async managerOverview({ date, branchId }) {
      const [start, end] = date === "all" ? [] : dayRange(date);
      const match = { ...(date === "all" ? {} : { "appointments.startTime": { $gte: start, $lt: end } }),
        ...(branchId ? { "appointments.branchId": new mongoose.Types.ObjectId(branchId) } : {}) };
      const rows = await Calendar.aggregate([
        { $unwind: "$appointments" }, { $match: match },
        { $group: { _id: "$appointments.status", count: { $sum: 1 } } },
      ]).exec();
      const counts = { booked: 0, checked_in: 0, completed: 0, paid: 0, cancelled: 0, no_show: 0 };
      for (const row of rows) if (row._id in counts) counts[row._id] = row.count;
      return { date, counts };
    },

    async managerAppointments({ date, branchId, stylistId, status, cursor, limit }) {
      const [start, end] = date === "all" ? [] : dayRange(date);
      const match = { ...(date === "all" ? {} : { startTime: { $gte: start, $lt: end } }),
        ...(branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {}),
        ...(stylistId ? { stylistId: new mongoose.Types.ObjectId(stylistId) } : {}),
        ...(status ? { status } : {}), ...cursorMatch("startTime", cursor) };
      const rows = await Calendar.aggregate([
        { $unwind: "$appointments" }, { $replaceRoot: { newRoot: "$appointments" } },
        { $match: match }, { $sort: { startTime: -1, _id: -1 } }, { $limit: limit + 1 },
        { $project: { customerName: 1, stylistId: 1, branchId: 1, serviceId: 1,
          bookedPrice: 1, startTime: 1, endTime: 1, status: 1, checkedInAt: 1,
          noShowAt: 1, createdAt: 1, updatedAt: 1 } },
      ]).exec();
      return paged(rows, limit, "startTime");
    },

    async managerAppointment(id) {
      return this.findById(id);
    },

    async managerPayments({ branchId, from, to, cursor, limit }) {
      const match = { branchId: new mongoose.Types.ObjectId(branchId) };
      const attemptedAt = {};
      if (from) attemptedAt.$gte = dayRange(from)[0];
      if (to) attemptedAt.$lt = dayRange(to)[1];
      if (Object.keys(attemptedAt).length) match.attemptedAt = attemptedAt;
      const base = [
        { $unwind: "$appointments" },
        { $match: { "appointments.branchId": new mongoose.Types.ObjectId(branchId) } },
        { $unwind: "$appointments.paymentAttempts" },
        { $project: { appointmentId: "$appointments._id", customerName: "$appointments.customerName",
          branchId: "$appointments.branchId", _id: "$appointments.paymentAttempts._id",
          requestId: "$appointments.paymentAttempts.requestId",
          amount: "$appointments.paymentAttempts.amount", provider: "$appointments.paymentAttempts.provider",
          status: "$appointments.paymentAttempts.status", attemptedAt: "$appointments.paymentAttempts.attemptedAt" } },
        { $match: match },
      ];
      const [rows, totals] = await Promise.all([
        Calendar.aggregate([...base, { $match: cursorMatch("attemptedAt", cursor) },
          { $sort: { attemptedAt: -1, _id: -1 } }, { $limit: limit + 1 }]).exec(),
        Calendar.aggregate([...base, { $match: { status: "success" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }]).exec(),
      ]);
      return { ...paged(rows, limit, "attemptedAt"), simulatedTotal: totals[0]?.total || 0 };
    },
  };
}
module.exports = { createBookingRepository };
