import assert from "node:assert/strict";
import test from "node:test";
import { shiftDate, dateLabel, vietnamToday } from "../src/stylist/date.ts";

test("stylist calendar crosses month and year boundaries", () => {
  assert.equal(shiftDate("2026-10-01", -1), "2026-09-30");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.match(dateLabel("2026-10-22", { day: "numeric", month: "numeric" }), /22/);
  assert.match(vietnamToday(), /^\d{4}-\d{2}-\d{2}$/);
});
