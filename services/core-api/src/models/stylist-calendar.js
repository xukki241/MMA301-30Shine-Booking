const mongoose = require("mongoose");
const { STATUSES } = require("../booking/rules");

function createCalendarModel(connection, collection = "stylist_calendars") {
  const paymentAttempt = new mongoose.Schema({
    requestId: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ["momo", "vnpay"], required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    attemptedAt: { type: Date, required: true },
  }, { versionKey: false });
  const appointment = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    customerName: { type: String },
    customerPhone: { type: String },
    stylistId: { type: mongoose.Schema.Types.ObjectId, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId },
    branchName: { type: String },
    branchAddress: { type: String },
    serviceId: { type: mongoose.Schema.Types.ObjectId },
    serviceName: { type: String },
    stylistName: { type: String },
    bookedPrice: { type: Number, min: 0 },
    wishes: { stylistPreference: String, specialRequest: String, referenceImages: [String] },
    paymentAttempts: { type: [paymentAttempt], default: [] },
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
