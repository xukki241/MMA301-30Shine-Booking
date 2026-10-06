const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const { createApp } = require("../src/app");
const secret = randomBytes(32).toString("hex");

test("Scalar API Documentation endpoints", async (t) => {
  const server = createApp(secret).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));

  const base = `http://127.0.0.1:${server.address().port}`;

  await t.test("GET /openapi.json returns valid OpenAPI 3.0.3 spec", async () => {
    const res = await fetch(`${base}/openapi.json`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /application\/json/);

    const data = await res.json();
    assert.equal(data.openapi, "3.0.3");
    assert.equal(data.info.title, "30Shine Backend API");
    assert.ok(data.paths["/health"]);
    assert.ok(data.paths["/branches"]);
    assert.ok(data.paths["/appointments"]);
    assert.ok(data.paths["/work-shifts"]);
    assert.ok(data.paths["/time-slots"]);
    assert.ok(data.components.securitySchemes.bearerAuth);

    assert.deepEqual(data.servers, [
      { url: "http://localhost:4102", description: "Core API" },
    ]);
    assert.equal(
      data.paths["/auth/login"].post.servers[0].url,
      "http://localhost:4101"
    );
    assert.equal(
      data.paths["/auth/register"].post.servers[0].url,
      "http://localhost:4101"
    );

    const tagNames = data.tags.map((tag) => tag.name);
    assert.deepEqual(tagNames, [
      "Hệ thống backend",
      "SHINE-02 · Authentication & Lấy Token",
      "SHINE-05 · Catalog API",
      "SHINE-06 · Work Shift & Time Slot",
      "SHINE-03/07 · Booking API",
      "SHINE-08 · Payment Mock",
    ]);
    assert.equal(tagNames.some((name) => /Mobile|Admin Web|Frontend/i.test(name)), false);

    assert.deepEqual(
      data.components.schemas.WorkShiftCreateRequest.required,
      ["stylistId", "branchId", "date", "startTime", "endTime"]
    );
    assert.equal(
      data.paths["/services/{id}"].put.requestBody.content["application/json"].schema.$ref,
      "#/components/schemas/ServiceUpdateRequest"
    );
    assert.equal(
      data.paths["/stylists/{id}"].put.requestBody.content["application/json"].schema.$ref,
      "#/components/schemas/StylistUpdateRequest"
    );
  });

  await t.test("GET /docs returns Scalar HTML page without authentication", async () => {
    const res = await fetch(`${base}/docs`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);

    const html = await res.text();
    // Scalar renders a custom html container with scalar script / tags
    assert.ok(
      html.includes("scalar") || html.includes("api-reference") || html.includes("30Shine Booking API"),
      "Response HTML should contain Scalar elements or page title"
    );
  });
});
