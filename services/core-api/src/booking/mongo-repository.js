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

    async listByStylist(stylistId, date) {
      if (!mongoose.Types.ObjectId.isValid(stylistId)) return [];
      const calendar = await Calendar.findById(stylistId).lean().exec();
      if (!calendar || !calendar.appointments) return [];
      let list = calendar.appointments.map(plain);
      if (date) {
        list = list.filter((a) => {
          const d = new Date(a.startTime);
          const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return localDate === date;
        });
      }
      return list;
    },

    /**
     * Return all booked/completed appointments for a stylist on a given date.
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
