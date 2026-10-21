const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSlotOptions, isThirtyMinuteStart } = require("../src/work-shifts/repository");

test("45 minute service starts every 30 minutes and occupied intervals remain disabled", () => {
  const shift = { startAt: new Date("2030-10-20T02:00:00Z"), endAt: new Date("2030-10-20T04:00:00Z") };
  const appointment = { startTime: new Date("2030-10-20T02:00:00Z"),
    endTime: new Date("2030-10-20T02:45:00Z"), status: "booked" };
  const slots = buildSlotOptions([shift], [appointment], 45, new Date("2020-01-01T00:00:00Z"));
  assert.deepEqual(slots.map((slot) => [slot.startTime.toISOString(), slot.available]), [
    ["2030-10-20T02:00:00.000Z", false],
    ["2030-10-20T02:30:00.000Z", false],
    ["2030-10-20T03:00:00.000Z", true],
  ]);
  assert.equal(isThirtyMinuteStart(shift.startAt, new Date("2030-10-20T02:30:00Z")), true);
  assert.equal(isThirtyMinuteStart(shift.startAt, new Date("2030-10-20T02:45:00Z")), false);
  assert.equal(buildSlotOptions([shift], [{ ...appointment, status: "cancelled" }], 45,
    new Date("2020-01-01T00:00:00Z"))[0].available, true);
  const shifted = { startAt: new Date("2030-10-20T02:15:00Z"), endAt: shift.endAt };
  assert.equal(buildSlotOptions([shifted], [], 45,
    new Date("2020-01-01T00:00:00Z"))[0].startTime.toISOString(), "2030-10-20T02:30:00.000Z");
});
