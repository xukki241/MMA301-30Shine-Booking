const mongoose = require("mongoose");

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
  return connection.model("WorkShift", schema, collection);
}

module.exports = { createWorkShiftModel };
