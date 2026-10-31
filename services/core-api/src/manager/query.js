const { BookingError, isId, STATUSES } = require("../booking/rules");

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayVietnam() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dayRange(date) {
  if (!validDate(date)) throw new BookingError(400, "Invalid date");
  const start = new Date(`${date}T00:00:00+07:00`);
  return [start, new Date(start.getTime() + 86400000)];
}

function objectId(value, name, required = false) {
  if (!value && !required) return undefined;
  if (!isId(value)) throw new BookingError(400, `Invalid ${name}`);
  return value.toLowerCase();
}

function pagination(query) {
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new BookingError(400, "Invalid limit");
  let cursor;
  if (query.cursor) {
    try {
      const data = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
      if (!isId(data.id) || !Number.isFinite(Date.parse(data.time))) throw new Error("cursor");
      cursor = { id: data.id.toLowerCase(), time: new Date(data.time) };
    } catch { throw new BookingError(400, "Invalid cursor"); }
  }
  return { limit, cursor };
}

function encodeCursor(time, id) {
  return Buffer.from(JSON.stringify({ time: new Date(time).toISOString(), id: String(id) })).toString("base64url");
}

function parseAppointmentsQuery(query) {
  const date = query.date || todayVietnam();
  if (date !== "all") dayRange(date);
  const status = query.status;
  if (status && !STATUSES.includes(status)) throw new BookingError(400, "Invalid status");
  return { date, branchId: objectId(query.branchId, "branchId"),
    stylistId: objectId(query.stylistId, "stylistId"), status, ...pagination(query) };
}

function parsePaymentsQuery(query) {
  const branchId = objectId(query.branchId, "branchId", true);
  if (query.from) dayRange(query.from);
  if (query.to) dayRange(query.to);
  if (query.from && query.to && query.from > query.to) throw new BookingError(400, "Invalid date range");
  return { branchId, from: query.from, to: query.to, ...pagination(query) };
}

module.exports = { dayRange, todayVietnam, parseAppointmentsQuery, parsePaymentsQuery, encodeCursor, objectId };
