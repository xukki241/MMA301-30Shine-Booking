const STATUSES = Object.freeze(["booked", "completed", "paid", "cancelled"]);
const ACTIVE_STATUSES = Object.freeze(["booked", "completed", "paid"]);
const ACTIONS = Object.freeze({
  complete: { from: "booked", to: "completed", role: "stylist", owner: "stylistId" },
  cancel: { from: "booked", to: "cancelled", role: "customer", owner: "customerId" },
  pay: { from: "completed", to: "paid", role: "customer", owner: "customerId" },
});

class BookingError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function isId(value) {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}

function overlaps(start, end, existingStart, existingEnd) {
  return start < existingEnd && end > existingStart;
}

// Require an explicit timezone and reject invalid calendar dates (e.g. Feb 30).
function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zone] = match;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (+month < 1 || +month > 12 || +day < 1 || +day > days ||
      +hour > 23 || +minute > 59 || +second > 59) return null;
  if (zone !== "Z" && (+zone.slice(1, 3) > 23 || +zone.slice(4) > 59)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function validateBooking(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some((k) => !["stylistId", "startTime", "endTime", "branchId", "serviceId"].includes(k))) {
    throw new BookingError(400, "Expected stylistId, startTime and endTime");
  }
  const startTime = parseTime(body.startTime);
  const endTime = parseTime(body.endTime);
  if (!isId(body.stylistId) || !startTime || !endTime || startTime >= endTime) {
    throw new BookingError(400, "Invalid stylistId or time interval");
  }
  if ((typeof body.branchId === "undefined") !== (typeof body.serviceId === "undefined") ||
      (typeof body.branchId !== "undefined" && (!isId(body.branchId) || !isId(body.serviceId)))) {
    throw new BookingError(400, "branchId and serviceId must be supplied together as ObjectIds");
  }
  return {
    stylistId: body.stylistId.toLowerCase(), startTime, endTime,
    ...(body.branchId ? { branchId: body.branchId.toLowerCase(), serviceId: body.serviceId.toLowerCase() } : {}),
  };
}

function validateDayRange(query) {
  if (!query || typeof query !== "object") {
    throw new BookingError(400, "from/to must be ISO 8601 with timezone, from < to, max 48h");
  }
  const from = parseTime(query.from);
  const to = parseTime(query.to);
  if (!from || !to || from >= to || to.getTime() - from.getTime() > 48 * 3600e3) {
    throw new BookingError(400, "from/to must be ISO 8601 with timezone, from < to, max 48h");
  }
  return { from, to };
}

module.exports = { STATUSES, ACTIVE_STATUSES, ACTIONS, BookingError, isId, overlaps, parseTime, validateBooking, validateDayRange };
