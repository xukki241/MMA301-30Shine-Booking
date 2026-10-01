/**
 * SHINE-06 — Unit tests for work-shift business rules.
 * Tests computeTimeSlots, shiftsOverlap, and validateWorkShift.
 * No database, no HTTP — pure logic.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeTimeSlots,
  shiftsOverlap,
  validateWorkShift,
  WorkShiftError,
  parseIsoTime,
} = require("../src/work-shift/rules");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function d(iso) {
  return new Date(iso);
}

function shift(startIso, endIso) {
  return { startTime: d(startIso), endTime: d(endIso) };
}

function appt(startIso, endIso, status = "booked") {
  return { startTime: d(startIso), endTime: d(endIso), status };
}

// A "now" that is safely in the past so we can test slot generation freely.
const PAST_NOW = d("2020-01-01T00:00:00Z");

// ---------------------------------------------------------------------------
// shiftsOverlap
// ---------------------------------------------------------------------------
test("shiftsOverlap: non-overlapping intervals", () => {
  assert.equal(shiftsOverlap(d("2026-10-10T09:00:00Z"), d("2026-10-10T10:00:00Z"),
                             d("2026-10-10T10:00:00Z"), d("2026-10-10T11:00:00Z")), false);
  assert.equal(shiftsOverlap(d("2026-10-10T11:00:00Z"), d("2026-10-10T12:00:00Z"),
                             d("2026-10-10T09:00:00Z"), d("2026-10-10T10:00:00Z")), false);
});

test("shiftsOverlap: overlapping intervals", () => {
  assert.equal(shiftsOverlap(d("2026-10-10T09:00:00Z"), d("2026-10-10T11:00:00Z"),
                             d("2026-10-10T10:00:00Z"), d("2026-10-10T12:00:00Z")), true);
});

test("shiftsOverlap: one contains the other", () => {
  assert.equal(shiftsOverlap(d("2026-10-10T08:00:00Z"), d("2026-10-10T18:00:00Z"),
                             d("2026-10-10T10:00:00Z"), d("2026-10-10T11:00:00Z")), true);
});

test("shiftsOverlap: exact same interval", () => {
  assert.equal(shiftsOverlap(d("2026-10-10T09:00:00Z"), d("2026-10-10T10:00:00Z"),
                             d("2026-10-10T09:00:00Z"), d("2026-10-10T10:00:00Z")), true);
});

// ---------------------------------------------------------------------------
// computeTimeSlots — basic generation
// ---------------------------------------------------------------------------
test("computeTimeSlots: generates slots from single shift, no appointments", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T11:30:00Z")];
  const slots = computeTimeSlots(shifts, [], 60, PAST_NOW);
  // 9:00–10:00, 10:00–11:00 (11:00–12:00 would exceed shift end at 11:30)
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { startTime: d("2026-10-10T09:00:00Z"), endTime: d("2026-10-10T10:00:00Z") });
  assert.deepEqual(slots[1], { startTime: d("2026-10-10T10:00:00Z"), endTime: d("2026-10-10T11:00:00Z") });
});

test("computeTimeSlots: slot that would exceed shift end is excluded", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T09:44:00Z")];
  // duration 45 min: only 09:00–09:45 would need 45 min but shift ends at 09:44
  const slots = computeTimeSlots(shifts, [], 45, PAST_NOW);
  assert.equal(slots.length, 0);
});

test("computeTimeSlots: slot exactly fits to shift end is included", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T10:30:00Z")];
  // 45 min slots: 9:00–9:45, 9:45–10:30 (exactly fits)
  const slots = computeTimeSlots(shifts, [], 45, PAST_NOW);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[1].endTime, d("2026-10-10T10:30:00Z"));
});

// ---------------------------------------------------------------------------
// computeTimeSlots — appointment blocking
// ---------------------------------------------------------------------------
test("computeTimeSlots: booked appointment blocks overlapping slot", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z")];
  // 60-min slots: 9:00, 10:00, 11:00 — appointment 9:30–10:30 blocks 9:00 and 10:00
  const appointments = [appt("2026-10-10T09:30:00Z", "2026-10-10T10:30:00Z", "booked")];
  const slots = computeTimeSlots(shifts, appointments, 60, PAST_NOW);
  assert.equal(slots.length, 1);
  assert.deepEqual(slots[0].startTime, d("2026-10-10T11:00:00Z"));
});

test("computeTimeSlots: completed appointment blocks slot", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z")];
  const appointments = [appt("2026-10-10T09:00:00Z", "2026-10-10T10:00:00Z", "completed")];
  const slots = computeTimeSlots(shifts, appointments, 60, PAST_NOW);
  assert.equal(slots.length, 2); // 10:00 and 11:00 are free
  assert.deepEqual(slots[0].startTime, d("2026-10-10T10:00:00Z"));
});

test("computeTimeSlots: paid and cancelled appointments do NOT block slots", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T11:00:00Z")];
  const appointments = [
    appt("2026-10-10T09:00:00Z", "2026-10-10T10:00:00Z", "paid"),
    appt("2026-10-10T10:00:00Z", "2026-10-10T11:00:00Z", "cancelled"),
  ];
  const slots = computeTimeSlots(shifts, appointments, 60, PAST_NOW);
  assert.equal(slots.length, 2);
});

// ---------------------------------------------------------------------------
// computeTimeSlots — past slot filtering
// ---------------------------------------------------------------------------
test("computeTimeSlots: slots in the past are excluded", () => {
  const now = d("2026-10-10T10:30:00Z");
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z")];
  // 60-min slots: 9:00 (past), 10:00 (past, starts before now), 11:00 (future)
  const slots = computeTimeSlots(shifts, [], 60, now);
  assert.equal(slots.length, 1);
  assert.deepEqual(slots[0].startTime, d("2026-10-10T11:00:00Z"));
});

test("computeTimeSlots: slot starting exactly at now is excluded (must be strictly future)", () => {
  const now = d("2026-10-10T11:00:00Z");
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z")];
  const slots = computeTimeSlots(shifts, [], 60, now);
  assert.equal(slots.length, 0);
});

// ---------------------------------------------------------------------------
// computeTimeSlots — multiple shifts
// ---------------------------------------------------------------------------
test("computeTimeSlots: multiple shifts on the same day are all sliced", () => {
  const shifts = [
    shift("2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z"), // 3 × 60-min = 3 slots
    shift("2026-10-10T14:00:00Z", "2026-10-10T16:00:00Z"), // 2 × 60-min = 2 slots
  ];
  const slots = computeTimeSlots(shifts, [], 60, PAST_NOW);
  assert.equal(slots.length, 5);
});

// ---------------------------------------------------------------------------
// computeTimeSlots — edge / guard cases
// ---------------------------------------------------------------------------
test("computeTimeSlots: empty shifts returns empty slots", () => {
  assert.equal(computeTimeSlots([], [], 45, PAST_NOW).length, 0);
});

test("computeTimeSlots: zero or negative duration returns empty slots", () => {
  const shifts = [shift("2026-10-10T09:00:00Z", "2026-10-10T12:00:00Z")];
  assert.equal(computeTimeSlots(shifts, [], 0, PAST_NOW).length, 0);
  assert.equal(computeTimeSlots(shifts, [], -30, PAST_NOW).length, 0);
});

// ---------------------------------------------------------------------------
// parseIsoTime
// ---------------------------------------------------------------------------
test("parseIsoTime: accepts UTC", () => {
  const d = parseIsoTime("2026-10-10T09:00:00Z");
  assert.ok(d instanceof Date);
  assert.ok(Number.isFinite(d.getTime()));
});

test("parseIsoTime: accepts +07:00 offset", () => {
  const d = parseIsoTime("2026-10-10T09:00:00+07:00");
  assert.ok(d instanceof Date);
});

test("parseIsoTime: rejects date-only string", () => {
  assert.equal(parseIsoTime("2026-10-10"), null);
});

test("parseIsoTime: rejects plain number", () => {
  assert.equal(parseIsoTime(1234567890), null);
});

// ---------------------------------------------------------------------------
// validateWorkShift
// ---------------------------------------------------------------------------
const validBody = {
  stylistId: "a".repeat(24),
  branchId: "b".repeat(24),
  date: "2026-10-10",
  startTime: "2026-10-10T09:00:00+07:00",
  endTime: "2026-10-10T17:00:00+07:00",
};

test("validateWorkShift: accepts valid body", () => {
  const result = validateWorkShift(validBody);
  assert.equal(result.stylistId, "a".repeat(24));
  assert.equal(result.date, "2026-10-10");
  assert.ok(result.startTime instanceof Date);
  assert.ok(result.endTime instanceof Date);
});

test("validateWorkShift: rejects missing stylistId", () => {
  const { stylistId: _, ...body } = validBody;
  assert.throws(() => validateWorkShift(body), (e) => e instanceof WorkShiftError && e.status === 400);
});

test("validateWorkShift: rejects invalid date format", () => {
  assert.throws(
    () => validateWorkShift({ ...validBody, date: "10/10/2026" }),
    (e) => e instanceof WorkShiftError && e.status === 400
  );
});

test("validateWorkShift: rejects startTime >= endTime", () => {
  assert.throws(
    () => validateWorkShift({ ...validBody, startTime: validBody.endTime, endTime: validBody.startTime }),
    (e) => e instanceof WorkShiftError && e.status === 400
  );
});

test("validateWorkShift: rejects extra unknown field", () => {
  assert.throws(
    () => validateWorkShift({ ...validBody, extraField: "oops" }),
    (e) => e instanceof WorkShiftError && e.status === 400
  );
});

test("validateWorkShift: rejects non-object body", () => {
  assert.throws(() => validateWorkShift(null), (e) => e instanceof WorkShiftError && e.status === 400);
  assert.throws(() => validateWorkShift("string"), (e) => e instanceof WorkShiftError && e.status === 400);
  assert.throws(() => validateWorkShift([]), (e) => e instanceof WorkShiftError && e.status === 400);
});
