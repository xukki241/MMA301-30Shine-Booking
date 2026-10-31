const mongoose = require("mongoose");
const { WorkShiftError, shiftsOverlap } = require("./rules");

/**
 * Serialize a WorkShift document to a plain object for API responses.
 */
function plain(doc) {
  return {
    id: String(doc._id),
    stylistId: String(doc.stylistId),
    branchId: String(doc.branchId),
    date: doc.date,
    startTime: doc.startTime,
    endTime: doc.endTime,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Create a WorkShift repository backed by MongoDB.
 * @param {import("mongoose").Model} WorkShift - The Mongoose model.
 */
function createWorkShiftRepository(WorkShift) {
  return {
    /**
     * Create a new Work Shift.
     * Enforces no-overlap within the same (stylistId, date) pair.
     * @param {object} data - Validated { stylistId, branchId, date, startTime, endTime }
     */
    async create(data) {
      // Check for overlapping shifts for this stylist on this date.
      const existing = await WorkShift.find({
        stylistId: new mongoose.Types.ObjectId(data.stylistId),
        date: data.date,
      }).lean().exec();

      const overlap = existing.some((s) =>
        shiftsOverlap(data.startTime, data.endTime, s.startTime, s.endTime)
      );
      if (overlap) {
        throw new WorkShiftError(
          409,
          "Stylist đã có ca làm việc bị trùng giờ trong ngày này"
        );
      }

      const shift = await WorkShift.create({
        stylistId: new mongoose.Types.ObjectId(data.stylistId),
        branchId: new mongoose.Types.ObjectId(data.branchId),
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      });
      return plain(shift.toObject({ transform: false }));
    },

    /**
     * Find all work shifts for a stylist on a specific date.
     * @param {string} stylistId
     * @param {string} date - "YYYY-MM-DD"
     */
    async findByStyleAndDate(stylistId, date) {
      const shifts = await WorkShift.find({
        stylistId: new mongoose.Types.ObjectId(stylistId),
        date,
      }).sort({ startTime: 1 }).lean().exec();
      return shifts.map(plain);
    },

    /**
     * Find a single work shift by its id.
     * @param {string} id
     */
    async findById(id) {
      const shift = await WorkShift.findById(id).lean().exec();
      return shift ? plain(shift) : null;
    },

    /**
     * Delete a work shift by id.
     * @param {string} id
     */
    async deleteById(id) {
      const shift = await WorkShift.findByIdAndDelete(id).lean().exec();
      return shift ? plain(shift) : null;
    },
  };
}

module.exports = { createWorkShiftRepository };
