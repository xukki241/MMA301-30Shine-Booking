const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBookingService } = require("../src/booking/service");
const { ACTIONS } = require("../src/booking/rules");

const stylistId = "507f1f77bcf86cd799439011";
const customerId = "507f1f77bcf86cd799439012";
const appointmentId = "507f1f77bcf86cd799439013";
const stylist = { role: "stylist", userId: stylistId };

function fixture(startTime = new Date(Date.now() - 20 * 60000)) {
  const appointment = { id: appointmentId, stylistId, customerId, startTime,
    endTime: new Date(startTime.getTime() + 45 * 60000), status: "booked" };
  const repository = {
    async findById() { return { ...appointment }; },
    async transition(_id, action, actor) {
      const rule = ACTIONS[action];
      if (appointment.status !== rule.from || appointment[rule.owner] !== actor.userId) return null;
      appointment.status = rule.to;
      if (action === "check_in") appointment.checkedInAt = actor.now;
      if (action === "undo_check_in") delete appointment.checkedInAt;
      return { ...appointment };
    },
  };
  return { appointment, service: createBookingService(repository) };
}

test("attendance requires check-in before completion and restricts actor", async () => {
  const { service } = fixture();
  await assert.rejects(service.transition(stylist, appointmentId, "complete"), /Invalid appointment state/);
  await assert.rejects(service.transition({ role: "stylist", userId: customerId }, appointmentId, "check_in"),
    /does not belong/);
  assert.equal((await service.transition(stylist, appointmentId, "check_in")).status, "checked_in");
  assert.equal((await service.transition(stylist, appointmentId, "complete")).status, "completed");
});

test("no-show waits fifteen minutes and never overrides checked-in customer", async () => {
  const early = fixture(new Date(Date.now() - 14 * 60000));
  await assert.rejects(early.service.transition(stylist, appointmentId, "no_show"), /Wait 15 minutes/);
  const late = fixture();
  assert.equal((await late.service.transition(stylist, appointmentId, "no_show")).status, "no_show");
  const waiting = fixture();
  await waiting.service.transition(stylist, appointmentId, "check_in");
  await assert.rejects(waiting.service.transition(stylist, appointmentId, "no_show"), /Invalid appointment state/);
});

test("undo check-in is limited to five minutes", async () => {
  const { appointment, service } = fixture();
  await service.transition(stylist, appointmentId, "check_in");
  assert.equal((await service.transition(stylist, appointmentId, "undo_check_in")).status, "booked");
  await service.transition(stylist, appointmentId, "check_in");
  appointment.checkedInAt = new Date(Date.now() - 6 * 60000);
  await assert.rejects(service.transition(stylist, appointmentId, "undo_check_in"), /within five minutes/);
});
