const mongoose = require("mongoose");
const { ACTIVE_STATUSES, BookingError, isId, parseTime } = require("../booking/rules");

const plain = (shift) => ({
  id: String(shift._id),
  branchId: String(shift.branchId),
  stylistId: String(shift.stylistId),
  date: shift.date,
  startAt: new Date(shift.startAt).toISOString(),
  endAt: new Date(shift.endAt).toISOString(),
});

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function interval(start, end) {
  const startAt = parseTime(start);
  const endAt = parseTime(end);
  return startAt && endAt && startAt < endAt ? { startAt, endAt } : null;
}

function shiftInterval(data) {
  const parsed = interval(data.startAt, data.endAt);
  const localStartDate = typeof data.startAt === "string" ? data.startAt.slice(0, 10) : "";
  const localEndDate = typeof data.endAt === "string" ? data.endAt.slice(0, 10) : "";
  if (!validDateKey(data.date) || !parsed || localStartDate !== data.date || localEndDate !== data.date) return null;
  return parsed;
}

function createWorkShiftRepository({ Branch, Service, StylistProfile, WorkShift, Calendar }) {
  async function assertReferences({ branchId, stylistId }) {
    if (!isId(branchId) || !isId(stylistId)) throw new BookingError(400, "Invalid branchId or stylistId");
    const [branch, stylist] = await Promise.all([
      Branch.findById(branchId),
      StylistProfile.findOne({ userId: stylistId, branchId, isActive: true }),
    ]);
    if (!branch) throw new BookingError(404, "Branch not found");
    if (!stylist) throw new BookingError(404, "Active stylist assignment not found for branch");
  }

  async function overlapsExisting(stylistId, startAt, endAt, exceptId) {
    const query = { stylistId, startAt: { $lt: endAt }, endAt: { $gt: startAt } };
    if (exceptId) query._id = { $ne: exceptId };
    return WorkShift.exists(query);
  }

  async function appointmentsFor(stylistId, startAt, endAt) {
    const calendar = await Calendar.findById(stylistId).lean().exec();
    return (calendar?.appointments || []).filter((item) => ACTIVE_STATUSES.includes(item.status) && item.startTime < endAt && item.endTime > startAt);
  }

  return {
    async create(data) {
      const parsed = shiftInterval(data);
      if (!parsed) {
        throw new BookingError(400, "Invalid date or shift interval; use ISO 8601 times with timezone");
      }
      await assertReferences(data);
      if (await overlapsExisting(data.stylistId, parsed.startAt, parsed.endAt)) throw new BookingError(409, "Stylist already has an overlapping work shift");
      const shift = await WorkShift.create({ ...data, ...parsed });
      return { shift: plain(shift) };
    },
    async list({ branchId, stylistId, date }) {
      const query = {};
      if (branchId) query.branchId = branchId;
      if (stylistId) query.stylistId = stylistId;
      if (date) {
        if (!validDateKey(date)) throw new BookingError(400, "Invalid date; expected YYYY-MM-DD");
        query.date = date;
      }
      return (await WorkShift.find(query).sort({ startAt: 1 }).lean().exec()).map(plain);
    },
    async update(id, changes) {
      const shift = await WorkShift.findById(id);
      if (!shift) return null;
      if (!["branchId", "stylistId", "date", "startAt", "endAt"].every((key) => Object.hasOwn(changes, key))) throw new BookingError(400, "Updating a shift requires branchId, stylistId, date, startAt and endAt");
      const next = { ...changes };
      const parsed = shiftInterval(next);
      if (!parsed) throw new BookingError(400, "Invalid date or shift interval; start and end must belong to the selected local date");
      await assertReferences(next);
      if (await overlapsExisting(next.stylistId, parsed.startAt, parsed.endAt, id)) throw new BookingError(409, "Stylist already has an overlapping work shift");
      const existingAppointments = await appointmentsFor(String(shift.stylistId), shift.startAt, shift.endAt);
      if (existingAppointments.some((a) => a.startTime < parsed.startAt || a.endTime > parsed.endAt ||
        String(next.stylistId) !== String(shift.stylistId) || String(next.branchId) !== String(shift.branchId))) {
        throw new BookingError(409, "Shift cannot be changed while it contains active appointments");
      }
      Object.assign(shift, next, parsed);
      await shift.save();
      return { shift: plain(shift) };
    },
    async remove(id) {
      const shift = await WorkShift.findById(id);
      if (!shift) return null;
      if (await appointmentsFor(String(shift.stylistId), shift.startAt, shift.endAt).then((items) => items.length)) {
        throw new BookingError(409, "Shift cannot be deleted while it contains active appointments");
      }
      await shift.deleteOne();
      return { id };
    },
    async availableSlots({ branchId, serviceId, stylistId, date }) {
      if (!isId(branchId) || !isId(serviceId) || !isId(stylistId) || !validDateKey(date)) throw new BookingError(400, "Invalid branch, service, stylist or date");
      const [branch, service, stylist, shifts] = await Promise.all([
        Branch.findById(branchId),
        Service.findOne({ _id: serviceId, branchId, isActive: true }),
        StylistProfile.findOne({ userId: stylistId, branchId, isActive: true }),
        WorkShift.find({ branchId, stylistId, date }).sort({ startAt: 1 }).lean().exec(),
      ]);
      if (!branch) throw new BookingError(404, "Branch not found");
      if (!service) throw new BookingError(404, "Active service not found for branch");
      if (!stylist) throw new BookingError(404, "Active stylist assignment not found for branch");
      const calendar = await Calendar.findById(stylistId).lean().exec();
      const appointments = (calendar?.appointments || []).filter((a) => ACTIVE_STATUSES.includes(a.status));
      const durationMs = service.durationMinutes * 60_000;
      const slots = [];
      for (const shift of shifts) {
        for (let start = new Date(shift.startAt), end = new Date(start.getTime() + durationMs); end <= shift.endAt;
          start = new Date(start.getTime() + durationMs), end = new Date(start.getTime() + durationMs)) {
          if (start > new Date() && !appointments.some((a) => start < a.endTime && end > a.startTime)) {
            slots.push({ id: `${stylistId}-${start.toISOString()}`, startTime: start.toISOString(), endTime: end.toISOString() });
          }
        }
      }
      return slots;
    },
    async validateBooking({ stylistId, branchId, serviceId, startTime, endTime }) {
      if (!branchId || !serviceId) throw new BookingError(400, "branchId and serviceId are required when booking an available slot");
      const shift = await WorkShift.findOne({ stylistId, startAt: { $lte: startTime }, endAt: { $gte: endTime } }).lean().exec();
      if (!shift) throw new BookingError(409, "Requested time is outside an assigned work shift");
      if (String(shift.branchId) !== branchId) throw new BookingError(409, "Requested time does not belong to the selected branch");
      const [service, stylist] = await Promise.all([
        Service.findOne({ _id: serviceId, branchId, isActive: true }).lean().exec(),
        StylistProfile.findOne({ userId: stylistId, branchId, isActive: true }).lean().exec(),
      ]);
      if (!service) throw new BookingError(404, "Active service not found for branch");
      if (!stylist) throw new BookingError(404, "Active stylist assignment not found for branch");
      const durationMs = service.durationMinutes * 60_000;
      if (endTime.getTime() - startTime.getTime() !== durationMs || (startTime.getTime() - shift.startAt.getTime()) % durationMs !== 0) {
        throw new BookingError(409, "Requested time does not match the selected service duration");
      }
    },
  };
}

module.exports = { createWorkShiftRepository, validDateKey, interval, shiftInterval };
