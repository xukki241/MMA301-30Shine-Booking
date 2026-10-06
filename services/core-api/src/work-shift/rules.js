// Work Shift business rules and error types for SHINE-06.

class WorkShiftError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a full ISO 8601 datetime string with explicit timezone.
 * Returns a Date or null on failure.
 */
function parseIsoTime(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Validate and parse request body for POST /work-shifts.
 * Returns { stylistId, branchId, date, startTime, endTime } or throws WorkShiftError(400).
 */
function validateWorkShift(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new WorkShiftError(400, "Body phải là JSON object chứa stylistId, branchId, date, startTime, endTime");
  }
  const allowed = ["stylistId", "branchId", "date", "startTime", "endTime"];
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length) {
    throw new WorkShiftError(400, `Trường không được phép: ${extra.join(", ")}`);
  }

  const { stylistId, branchId, date, startTime: rawStart, endTime: rawEnd } = body;

  if (!/^[a-f0-9]{24}$/i.test(stylistId)) {
    throw new WorkShiftError(400, "stylistId phải là ObjectId 24 ký tự hex hợp lệ");
  }
  if (!/^[a-f0-9]{24}$/i.test(branchId)) {
    throw new WorkShiftError(400, "branchId phải là ObjectId 24 ký tự hex hợp lệ");
  }
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    throw new WorkShiftError(400, "date phải có định dạng YYYY-MM-DD");
  }

  const startTime = parseIsoTime(rawStart);
  const endTime = parseIsoTime(rawEnd);
  if (!startTime) throw new WorkShiftError(400, "startTime phải là ISO 8601 datetime với timezone (VD: 2026-10-10T09:00:00+07:00)");
  if (!endTime) throw new WorkShiftError(400, "endTime phải là ISO 8601 datetime với timezone (VD: 2026-10-10T17:00:00+07:00)");
  if (startTime >= endTime) throw new WorkShiftError(400, "startTime phải trước endTime");

  return {
    stylistId: stylistId.toLowerCase(),
    branchId: branchId.toLowerCase(),
    date,
    startTime,
    endTime,
  };
}

/**
 * Returns true if two [start, end) intervals overlap.
 */
function shiftsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Calculate available Time Slots from a list of work shifts and booked appointments.
 *
 * @param {Array<{startTime: Date, endTime: Date}>} shifts - Work shifts for the stylist on the date.
 * @param {Array<{startTime: Date, endTime: Date, status: string}>} appointments - All appointments for stylist on date.
 * @param {number} durationMinutes - Duration of the selected service in minutes.
 * @param {Date} [now] - Current time for filtering past slots (defaults to new Date()).
 * @returns {Array<{startTime: Date, endTime: Date}>}
 */
function computeTimeSlots(shifts, appointments, durationMinutes, now = new Date()) {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return [];
  const durationMs = durationMinutes * 60_000;

  // Only booked/completed appointments block slots.
  const active = appointments.filter((a) => a.status === "booked" || a.status === "completed");

  const slots = [];
  for (const shift of shifts) {
    // Walk through the shift window in service-duration steps.
    let cursor = shift.startTime.getTime();
    const shiftEnd = shift.endTime.getTime();

    while (cursor + durationMs <= shiftEnd) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + durationMs);

      // Only include future slots.
      if (slotStart.getTime() > now.getTime()) {
        // Check overlap with any active appointment.
        const blocked = active.some((a) =>
          shiftsOverlap(slotStart, slotEnd, a.startTime, a.endTime)
        );
        if (!blocked) {
          slots.push({ startTime: slotStart, endTime: slotEnd });
        }
      }

      cursor += durationMs;
    }
  }
  return slots;
}

module.exports = { WorkShiftError, validateWorkShift, shiftsOverlap, computeTimeSlots, parseIsoTime };
