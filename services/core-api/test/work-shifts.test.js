const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { BookingError } = require("../src/booking/rules");
const { shiftInterval, buildSlotOptions } = require("../src/work-shifts/repository");

const ids = {
  branch: "507f1f77bcf86cd799439001",
  service: "507f1f77bcf86cd799439002",
  stylist: "507f1f77bcf86cd799439003",
  admin: "507f1f77bcf86cd799439004",
  customer: "507f1f77bcf86cd799439005",
};

function createShiftStore() {
  const shifts = [];
  const appointments = [];
  return {
    shifts,
    appointments,
    async create(data) {
      const startAt = new Date(data.startAt), endAt = new Date(data.endAt);
      const duplicate = shifts.some((shift) => shift.stylistId === data.stylistId &&
        startAt < shift.endAt && endAt > shift.startAt);
      if (duplicate) throw new BookingError(409, "Stylist already has an overlapping work shift");
      const shift = { id: String(shifts.length + 1).padStart(24, "0"), ...data, startAt, endAt };
      shifts.push(shift);
      return { shift };
    },
    async list(query) {
      return shifts.filter((shift) => (!query.branchId || shift.branchId === query.branchId) &&
        (!query.stylistId || shift.stylistId === query.stylistId) &&
        (!query.date || shift.date === query.date));
    },
    async update(id, data) {
      const shift = shifts.find((item) => item.id === id);
      if (!shift) return null;
      const next = { ...shift, ...data, startAt: data.startAt ? new Date(data.startAt) : shift.startAt, endAt: data.endAt ? new Date(data.endAt) : shift.endAt };
      if (appointments.some((appointment) => appointment.stylistId === shift.stylistId &&
        appointment.status !== "cancelled" && appointment.startTime < shift.endAt &&
        appointment.endTime > shift.startAt &&
        !(appointment.startTime >= next.startAt && appointment.endTime <= next.endAt))) {
        throw new BookingError(409, "Shift cannot be changed while it contains active appointments");
      }
      Object.assign(shift, next);
      return { shift };
    },
    async remove(id) {
      const index = shifts.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const shift = shifts[index];
      if (appointments.some((appointment) => appointment.stylistId === shift.stylistId &&
        appointment.status !== "cancelled" && appointment.startTime < shift.endAt &&
        appointment.endTime > shift.startAt)) throw new BookingError(409, "Shift cannot be deleted while it contains active appointments");
      shifts.splice(index, 1);
      return { id };
    },
    async availableSlots(query) {
      const day = query.date;
      const service = { id: ids.service, branchId: ids.branch, durationMinutes: 45 };
      const active = appointments.filter((a) => a.stylistId === query.stylistId);
      return shifts.filter((shift) => shift.branchId === query.branchId && shift.stylistId === query.stylistId && shift.date === day)
        .flatMap((shift) => {
          return buildSlotOptions([shift], active, service.durationMinutes).map((slot) => ({
            id: slot.startTime.toISOString(), startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(), available: slot.available,
          }));
        });
    },
    async book(data) {
      if (!shifts.some((shift) => shift.stylistId === data.stylistId && data.startTime >= new Date(shift.startAt) && data.endTime <= new Date(shift.endAt))) {
        throw new BookingError(409, "Requested time is outside an assigned work shift");
      }
      if (appointments.some((a) => a.stylistId === data.stylistId && a.status !== "cancelled" && data.startTime < a.endTime && data.endTime > a.startTime)) throw new BookingError(409, "Stylist already has an overlapping appointment");
      appointments.push({ ...data, status: "booked" });
      return appointments.at(-1);
    },
    async validateBooking(data) {
      if (data.branchId !== ids.branch || data.serviceId !== ids.service || data.endTime.getTime() - data.startTime.getTime() !== 45 * 60000 ||
          !shifts.some((shift) => shift.stylistId === data.stylistId &&
            buildSlotOptions([shift], appointments.filter((a) => a.stylistId === data.stylistId), 45,
              new Date(0)).some((slot) => slot.available &&
              slot.startTime.getTime() === data.startTime.getTime()))) throw new BookingError(409, "Requested time does not match the active service");
      if (!shifts.some((shift) => shift.stylistId === data.stylistId && data.startTime >= new Date(shift.startAt) && data.endTime <= new Date(shift.endAt))) throw new BookingError(409, "Requested time is outside an assigned work shift");
      return { bookedPrice: 120000 };
    },
  };
}

test("Work Shift intervals require an explicit valid local day and ISO timezone", () => {
  assert.ok(shiftInterval({ date: "2030-10-20", startAt: "2030-10-20T09:00:00+07:00", endAt: "2030-10-20T12:00:00+07:00" }));
  assert.equal(shiftInterval({ date: "2030-02-30", startAt: "2030-02-30T09:00:00+07:00", endAt: "2030-02-30T12:00:00+07:00" }), null);
  assert.equal(shiftInterval({ date: "2030-10-20", startAt: "2030-10-20T09:00:00", endAt: "2030-10-20T12:00:00" }), null);
  assert.equal(shiftInterval({ date: "2030-10-20", startAt: "2030-10-20T12:00:00+07:00", endAt: "2030-10-20T09:00:00+07:00" }), null);
  assert.equal(shiftInterval({ date: "2030-10-20", startAt: "2030-10-19T23:00:00-07:00", endAt: "2030-10-20T02:00:00-07:00" }), null);
});

test("work shifts require General Manager, block appointment conflicts, and provide slots mobile can book", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const store = createShiftStore();
  const app = createApp({ secret, workShiftRepository: store, bookingRepository: store, verifyStaff: async () => true, verifyCustomer: async () => true,
    verifyActiveStylist: async () => true });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = (role, id) => jwt.sign({ sub: id, role, authVersion: 0 }, secret, { algorithm: "HS256", expiresIn: 3600 });
  const admin = { Authorization: `Bearer ${token("general_manager", ids.admin)}`, "Content-Type": "application/json" };
  const customer = { Authorization: `Bearer ${token("customer", ids.customer)}`, "Content-Type": "application/json" };
  const systemAdmin = { Authorization: `Bearer ${token("system_admin", ids.admin)}` };
  assert.equal((await fetch(`${base}/work-shifts`, { headers: systemAdmin })).status, 403);
  assert.equal((await fetch(`${base}/work-shifts`, { headers: admin })).status, 200);
  const payload = { branchId: ids.branch, stylistId: ids.stylist, date: "2030-10-20", startAt: "2030-10-20T09:00:00+07:00", endAt: "2030-10-20T12:00:00+07:00" };

  const forbidden = await fetch(`${base}/work-shifts`, { method: "POST", headers: customer, body: JSON.stringify(payload) });
  assert.equal(forbidden.status, 403);
  const created = await fetch(`${base}/work-shifts`, { method: "POST", headers: admin, body: JSON.stringify(payload) });
  assert.equal(created.status, 201);
  const shift = (await created.json()).workShift;
  const overlap = await fetch(`${base}/work-shifts`, { method: "POST", headers: admin, body: JSON.stringify({ ...payload, startAt: "2030-10-20T11:00:00+07:00", endAt: "2030-10-20T13:00:00+07:00" }) });
  assert.equal(overlap.status, 409);

  const slotsResponse = await fetch(`${base}/time-slots?branchId=${ids.branch}&serviceId=${ids.service}&stylistId=${ids.stylist}&date=2030-10-20`, { headers: customer });
  assert.equal(slotsResponse.status, 200);
  const slots = (await slotsResponse.json()).slots;
  assert.equal(slots.length, 10);
  assert.equal(slots[0].startTime, "2030-10-20T02:00:00.000Z");
  assert.equal(slots[1].startTime, "2030-10-20T02:20:00.000Z");

  const booking = await fetch(`${base}/appointments`, { method: "POST", headers: customer, body: JSON.stringify({ branchId: ids.branch, serviceId: ids.service, stylistId: ids.stylist, startTime: slots[0].startTime, endTime: slots[0].endTime }) });
  assert.equal(booking.status, 201);
  assert.equal((await booking.json()).appointment.bookedPrice, 120000);
  const tamperedPrice = await fetch(`${base}/appointments`, { method: "POST", headers: customer, body: JSON.stringify({ branchId: ids.branch, serviceId: ids.service, stylistId: ids.stylist, startTime: slots[1].startTime, endTime: slots[1].endTime, bookedPrice: 1 }) });
  assert.equal(tamperedPrice.status, 400);
  const refreshedSlots = await fetch(`${base}/time-slots?branchId=${ids.branch}&serviceId=${ids.service}&stylistId=${ids.stylist}&date=2030-10-20`, { headers: customer });
  const refreshed = (await refreshedSlots.json()).slots;
  assert.equal(refreshed.length, 10);
  assert.equal(refreshed[0].available, false);
  assert.equal(refreshed[1].available, false);
  assert.equal(refreshed[2].available, false);
  assert.equal(refreshed[3].available, true);
  assert.equal(refreshed[9].available, false);
  const duplicate = await fetch(`${base}/appointments`, { method: "POST", headers: customer,
    body: JSON.stringify({ branchId: ids.branch, serviceId: ids.service, stylistId: ids.stylist,
      startTime: slots[0].startTime, endTime: slots[0].endTime }) });
  assert.equal(duplicate.status, 409);
  const wrongDuration = await fetch(`${base}/appointments`, { method: "POST", headers: customer, body: JSON.stringify({ branchId: ids.branch, serviceId: ids.service, stylistId: ids.stylist, startTime: slots[1].startTime, endTime: "2030-10-20T03:15:00.000Z" }) });
  assert.equal(wrongDuration.status, 409);
  const blockedEdit = await fetch(`${base}/work-shifts/${shift.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ ...payload, startAt: "2030-10-20T10:00:00+07:00" }) });
  assert.equal(blockedEdit.status, 409);
  const blockedDelete = await fetch(`${base}/work-shifts/${shift.id}`, { method: "DELETE", headers: admin });
  assert.equal(blockedDelete.status, 409);
  const outsideBooking = await fetch(`${base}/appointments`, { method: "POST", headers: customer, body: JSON.stringify({ branchId: ids.branch, serviceId: ids.service, stylistId: ids.stylist, startTime: "2030-10-20T05:00:00.000Z", endTime: "2030-10-20T05:45:00.000Z" }) });
  assert.equal(outsideBooking.status, 409);
});
