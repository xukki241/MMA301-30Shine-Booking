const mongoose = require("mongoose");
const { ACTIVE_STATUSES, ACTIONS, BookingError } = require("./rules");

function plain(appointment) {
  return {
    id: String(appointment._id),
    customerId: String(appointment.customerId),
    stylistId: String(appointment.stylistId),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
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

    async transition(id, action, actor) {
      const rule = ACTIONS[action];
      if (!rule || actor.role !== rule.role) throw new BookingError(403, "Action not permitted");
      // Compare-and-set prevents concurrent transitions from overwriting a new state.
      const calendar = await Calendar.findOneAndUpdate({
        appointments: { $elemMatch: {
          _id: id, status: rule.from, [rule.owner]: actor.userId,
        } },
      }, { $set: {
        "appointments.$.status": rule.to,
        "appointments.$.updatedAt": new Date(),
      } }, {
        returnDocument: "after", runValidators: true,
        projection: { appointments: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } },
      }).lean().exec();
      return calendar ? plain(calendar.appointments[0]) : null;
    },
  };
}
module.exports = { createBookingRepository };
