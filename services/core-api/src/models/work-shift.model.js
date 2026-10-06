const mongoose = require("mongoose");

<<<<<<< HEAD
function createWorkShiftModel(connection, collection = "work_shifts") {
  const schema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    stylistId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  }, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_doc, ret) => { ret.id = String(ret._id); ret.branchId = String(ret.branchId); ret.stylistId = String(ret.stylistId); delete ret._id; return ret; } },
  });
  schema.index({ stylistId: 1, date: 1, startAt: 1 });
  schema.pre("validate", function () {
    if (this.startAt && this.endAt && this.startAt >= this.endAt) this.invalidate("endAt", "endAt must be after startAt");
  });
=======
// DATE_RE: matches YYYY-MM-DD only (no timezone); the shift date in local salon time.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function createWorkShiftModel(connection, collection = "work_shifts") {
  const schema = new mongoose.Schema(
    {
      stylistId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Mã stylist (stylistId) là bắt buộc"],
        index: true,
      },
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: [true, "Mã chi nhánh là bắt buộc"],
        index: true,
      },
      // ISO 8601 date string: "YYYY-MM-DD" (local salon date, no timezone component).
      date: {
        type: String,
        required: [true, "Ngày làm việc là bắt buộc"],
        validate: {
          validator: (v) => DATE_RE.test(v),
          message: "Ngày làm việc phải có định dạng YYYY-MM-DD",
        },
        index: true,
      },
      // Full ISO 8601 datetime with timezone — e.g. "2026-10-10T09:00:00+07:00"
      startTime: {
        type: Date,
        required: [true, "Giờ bắt đầu ca (startTime) là bắt buộc"],
      },
      endTime: {
        type: Date,
        required: [true, "Giờ kết thúc ca (endTime) là bắt buộc"],
      },
    },
    {
      timestamps: true,
      versionKey: false,
      toJSON: {
        transform: (_doc, ret) => {
          ret.id = String(ret._id);
          ret.stylistId = String(ret.stylistId);
          ret.branchId = String(ret.branchId);
          delete ret._id;
          return ret;
        },
      },
    }
  );

  schema.pre("validate", function () {
    if (this.startTime && this.endTime && this.startTime >= this.endTime) {
      this.invalidate("endTime", "Giờ kết thúc ca phải sau giờ bắt đầu ca");
    }
  });

  // Compound index for overlap query: (stylistId, date) pairs are queried together.
  schema.index({ stylistId: 1, date: 1 });

>>>>>>> origin/develop
  return connection.model("WorkShift", schema, collection);
}

module.exports = { createWorkShiftModel };
