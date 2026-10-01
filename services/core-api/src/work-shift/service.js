const mongoose = require("mongoose");
const { WorkShiftError, validateWorkShift, computeTimeSlots } = require("./rules");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DURATION_MINUTES_MIN = 1;
const DURATION_MINUTES_MAX = 480; // 8 hours max per service

function isId(value) {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}

/**
 * Create the WorkShift service containing all business logic.
 *
 * @param {object} workShiftRepository - WorkShift CRUD repository.
 * @param {object} calendarRepository  - Must expose `getActiveAppointmentsForStylistDate(stylistId, date)`.
 * @param {object} serviceModel        - Mongoose Service model (to look up durationMinutes).
 */
function createWorkShiftService(workShiftRepository, calendarRepository, serviceModel) {
  return {
    /**
     * POST /work-shifts — Only shop_admin may call this.
     */
    async create(actor, body) {
      if (actor.role !== "shop_admin") {
        throw new WorkShiftError(403, "Chỉ Shop Admin mới có thể tạo ca làm việc");
      }
      const data = validateWorkShift(body);
      return workShiftRepository.create(data);
    },

    /**
     * GET /work-shifts?stylistId=&date= — Only shop_admin may call this.
     */
    async list(actor, query) {
      if (actor.role !== "shop_admin") {
        throw new WorkShiftError(403, "Chỉ Shop Admin mới có thể xem ca làm việc");
      }
      const { stylistId, date } = query || {};
      if (!isId(stylistId)) {
        throw new WorkShiftError(400, "stylistId là bắt buộc và phải là ObjectId 24 ký tự hex");
      }
      if (typeof date !== "string" || !DATE_RE.test(date)) {
        throw new WorkShiftError(400, "date là bắt buộc và phải có định dạng YYYY-MM-DD");
      }
      return workShiftRepository.findByStyleAndDate(stylistId.toLowerCase(), date);
    },

    /**
     * DELETE /work-shifts/:id — Only shop_admin may call this.
     */
    async remove(actor, id) {
      if (actor.role !== "shop_admin") {
        throw new WorkShiftError(403, "Chỉ Shop Admin mới có thể xóa ca làm việc");
      }
      if (!isId(id)) {
        throw new WorkShiftError(400, "Định dạng id ca làm việc không hợp lệ");
      }
      const shift = await workShiftRepository.deleteById(id.toLowerCase());
      if (!shift) throw new WorkShiftError(404, "Không tìm thấy ca làm việc");
      return shift;
    },

    /**
     * GET /time-slots?stylistId=&date=&serviceId=
     * Public (no role restriction — any authenticated user may query).
     */
    async listTimeSlots(actor, query) {
      // Any authenticated user can query time slots (customer needs this for booking).
      if (!actor || !actor.role) {
        throw new WorkShiftError(401, "Yêu cầu xác thực");
      }

      const { stylistId, date, serviceId } = query || {};
      if (!isId(stylistId)) {
        throw new WorkShiftError(400, "stylistId là bắt buộc và phải là ObjectId 24 ký tự hex");
      }
      if (typeof date !== "string" || !DATE_RE.test(date)) {
        throw new WorkShiftError(400, "date là bắt buộc và phải có định dạng YYYY-MM-DD");
      }
      if (!isId(serviceId)) {
        throw new WorkShiftError(400, "serviceId là bắt buộc và phải là ObjectId 24 ký tự hex");
      }

      // Look up service duration.
      const service = await serviceModel.findById(serviceId).lean().exec();
      if (!service) throw new WorkShiftError(404, "Không tìm thấy dịch vụ");

      const { durationMinutes } = service;
      if (!Number.isInteger(durationMinutes) || durationMinutes < DURATION_MINUTES_MIN || durationMinutes > DURATION_MINUTES_MAX) {
        throw new WorkShiftError(500, "Thời lượng dịch vụ không hợp lệ");
      }

      // Fetch work shifts for this stylist + date.
      const rawShifts = await workShiftRepository.findByStyleAndDate(stylistId.toLowerCase(), date);

      if (rawShifts.length === 0) return [];

      // Fetch active appointments for this stylist on this date (booked + completed).
      const appointments = await calendarRepository.getActiveAppointmentsForStylistDate(
        stylistId.toLowerCase(),
        date
      );

      // Compute slots.
      const slots = computeTimeSlots(rawShifts, appointments, durationMinutes);

      return slots.map((slot) => ({
        id: `${stylistId}-${date}-${slot.startTime.toISOString()}`,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      }));
    },
  };
}

module.exports = { createWorkShiftService };
