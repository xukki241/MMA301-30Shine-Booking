const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");

const id = () => randomBytes(12).toString("hex");
async function startHttp(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return "http://127.0.0.1:" + server.address().port;
}

async function bookingContract(t, firstRepository, secondRepository = firstRepository) {
  const secret = randomBytes(32).toString("hex");
  const base = await startHttp(t, createApp(secret, firstRepository));
  const secondBase = await startHttp(t, createApp(secret, secondRepository));
  const customer = { userId: id(), role: "customer" };
  const stranger = { userId: id(), role: "customer" };
  const bodyFor = (stylistId = id(), startTime = "2030-10-20T10:00:00Z", endTime = "2030-10-20T11:00:00Z") =>
    ({ stylistId, startTime, endTime });
  async function post(path, actor, body, target = base, method = "POST") {
    const response = await fetch(target + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(actor ? { Authorization: "Bearer " + jwt.sign({ role: actor.role }, secret, {
          subject: actor.userId, expiresIn: 3600, algorithm: "HS256",
        }) } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const type = response.headers.get("content-type") || "";
    return { status: response.status, body: type.includes("json") ? await response.json() : await response.text() };
  }
  async function book(body = bodyFor()) {
    const response = await post("/appointments", customer, body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.appointment;
  }
  const act = (appointment, action, actor) => post("/appointments/" + appointment.id + "/" + action, actor);

  await t.test("book -> 201 + booked; JWT determines customer ownership", async () => {
    const appointment = await book();
    assert.equal(appointment.status, "booked");
    assert.equal(appointment.customerId, customer.userId);
    assert.equal(appointment.startTime, "2030-10-20T10:00:00.000Z");
  });
  await t.test("same slot and all four overlap shapes -> 409; adjacent -> 201", async () => {
    const stylistId = id();
    await book(bodyFor(stylistId));
    for (const [start, end] of [["10:00", "11:00"], ["10:30", "11:30"],
      ["09:30", "10:30"], ["10:15", "10:45"], ["09:00", "12:00"]]) {
      const response = await post("/appointments", customer,
        bodyFor(stylistId, "2030-10-20T" + start + ":00Z", "2030-10-20T" + end + ":00Z"));
      assert.equal(response.status, 409);
    }
    await book(bodyFor(stylistId, "2030-10-20T09:00:00Z", "2030-10-20T10:00:00Z"));
    await book(bodyFor(stylistId, "2030-10-20T11:00:00Z", "2030-10-20T12:00:00Z"));
    await book(bodyFor(id())); // Different stylist, same time is independent.
  });
  await t.test("concurrent same-slot HTTP requests on separate app instances: 201 + 409", async () => {
    // Exercise first-use creation of the same stylist calendar repeatedly.
    for (let run = 0; run < 5; run++) {
      const body = bodyFor(id());
      const results = await Promise.all([
        post("/appointments", customer, body),
        post("/appointments", stranger, body, secondBase),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    }
  });
  await t.test("concurrent partial overlap: one 201, one 409", async () => {
    const stylistId = id();
    const results = await Promise.all([
      post("/appointments", customer, bodyFor(stylistId)),
      post("/appointments", customer,
        bodyFor(stylistId, "2030-10-20T10:30:00Z", "2030-10-20T11:30:00Z"), secondBase),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  });
  await t.test("overlap works across midnight and timezone offsets", async () => {
    const stylistId = id();
    await book(bodyFor(stylistId, "2030-10-20T23:30:00Z", "2030-10-21T00:30:00Z"));
    assert.equal((await post("/appointments", customer,
      bodyFor(stylistId, "2030-10-21T07:00:00+07:00", "2030-10-21T08:00:00+07:00"))).status, 409);
  });
  await t.test("correct stylist complete; wrong stylist/customer/admin -> 403", async () => {
    const appointment = await book();
    for (const actor of [{ userId: id(), role: "stylist" }, customer, { userId: id(), role: "shop_admin" }]) {
      assert.equal((await act(appointment, "complete", actor)).status, 403);
    }
    const completed = await act(appointment, "complete", { userId: appointment.stylistId, role: "stylist" });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.appointment.status, "completed");
  });
  await t.test("customer ownership enforced for cancel and pay", async () => {
    const appointment = await book();
    assert.equal((await act(appointment, "cancel", stranger)).status, 403);
    await act(appointment, "complete", { userId: appointment.stylistId, role: "stylist" });
    assert.equal((await act(appointment, "pay", stranger)).status, 403);
    assert.equal((await act(appointment, "pay", { userId: appointment.stylistId, role: "stylist" })).status, 403);
  });
  await t.test("all 12 state/action combinations: only 3 transitions allowed", async (stateTest) => {
    for (const state of ["booked", "completed", "paid", "cancelled"]) {
      for (const action of ["complete", "cancel", "pay"]) {
        await stateTest.test(state + " / " + action, async () => {
          const appointment = await book();
          const stylist = { userId: appointment.stylistId, role: "stylist" };
          if (state === "completed" || state === "paid") {
            assert.equal((await act(appointment, "complete", stylist)).status, 200);
          }
          if (state === "paid") assert.equal((await act(appointment, "pay", customer)).status, 200);
          if (state === "cancelled") assert.equal((await act(appointment, "cancel", customer)).status, 200);
          const expected = { "booked/complete": "completed", "booked/cancel": "cancelled", "completed/pay": "paid" }[state + "/" + action];
          const response = await act(appointment, action, action === "complete" ? stylist : customer);
          assert.equal(response.status, expected ? 200 : 400);
          if (expected) assert.equal(response.body.appointment.status, expected);
          const saved = await firstRepository.findById(appointment.id);
          assert.equal(saved.status, expected || state);
        });
      }
    }
  });
  await t.test("completed/paid still occupy time; cancellation releases it", async () => {
    for (const state of ["completed", "paid", "cancelled"]) {
      const body = bodyFor();
      const appointment = await book(body);
      const stylist = { userId: appointment.stylistId, role: "stylist" };
      if (state !== "cancelled") await act(appointment, "complete", stylist);
      if (state === "paid") await act(appointment, "pay", customer);
      if (state === "cancelled") await act(appointment, "cancel", customer);
      assert.equal((await post("/appointments", customer, body)).status, state === "cancelled" ? 201 : 409);
    }
  });
  await t.test("concurrent complete/cancel cannot overwrite each other's state", async () => {
    const appointment = await book();
    const results = await Promise.all([
      act(appointment, "complete", { userId: appointment.stylistId, role: "stylist" }),
      post("/appointments/" + appointment.id + "/cancel", customer, undefined, secondBase),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    const winner = results.find((r) => r.status === 200).body.appointment.status;
    assert.equal((await firstRepository.findById(appointment.id)).status, winner);
  });
  await t.test("invalid input=400; no token=401; non-customer book=403", async () => {
    const valid = bodyFor();
    for (const body of [null, [], {}, { ...valid, startTime: valid.endTime },
      { ...valid, endTime: "2030-10-20T09:00:00Z" },
      { ...valid, startTime: "2030-02-30T10:00:00Z" },
      { ...valid, startTime: "2030-10-20T10:00:00" },
      { ...valid, stylistId: { $ne: null } }, { ...valid, customerId: stranger.userId },
      { ...valid, status: "paid" }]) {
      assert.equal((await post("/appointments", customer, body)).status, 400);
    }
    assert.equal((await post("/appointments", null, valid)).status, 401);
    assert.equal((await post("/appointments", { userId: id(), role: "stylist" }, valid)).status, 403);
  });
  await t.test("not found=404; invalid id=400; generic updates cannot bypass states", async () => {
    for (const action of ["complete", "cancel", "pay"]) {
      assert.equal((await post("/appointments/" + id() + "/" + action, customer)).status, 404);
      assert.equal((await post("/appointments/bad-id/" + action, customer)).status, 400);
    }
    const appointment = await book();
    assert.equal((await post("/appointments/" + appointment.id + "/cancel", customer, { status: "paid" })).status, 400);
    assert.equal((await post("/appointments/" + appointment.id, customer, { status: "paid" }, base, "PATCH")).status, 404);
    assert.equal((await firstRepository.findById(appointment.id)).status, "booked");
  });
}
module.exports = { bookingContract, startHttp, id };
