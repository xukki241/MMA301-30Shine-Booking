const mongoose = require("mongoose");
const { STATUSES } = require("../booking/rules");

function createCalendarModel(connection, collection = "stylist_calendars") {
  const appointment = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    stylistId: { type: mongoose.Schema.Types.ObjectId, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: "booked", required: true },
  }, { timestamps: true, versionKey: false });
  appointment.pre("validate", function () {
    if (this.startTime && this.endTime && this.startTime >= this.endTime) {
      this.invalidate("endTime", "endTime must be after startTime");
    }
  });
  // _id is the stylist's user id. All overlap checks/writes share one atomic document.
  const calendar = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    appointments: { type: [appointment], default: [] },
  }, { versionKey: false });
  calendar.index({ "appointments._id": 1 });
  return connection.model("StylistCalendar", calendar, collection);
}
module.exports = { createCalendarModel };
