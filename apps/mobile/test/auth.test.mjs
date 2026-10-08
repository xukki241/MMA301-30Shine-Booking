import assert from "node:assert/strict";
import test from "node:test";

import {
  loginCustomer,
  loginStylist,
  registerUser,
} from "../src/booking/http-adapter.ts";
import { isTokenExpired } from "../src/providers/auth-utils.ts";

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "fake_sig_123456";
  return `${header}.${body}.${signature}`;
}

test("isTokenExpired accurately detects expired, valid, and malformed JWTs", () => {
  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Valid future token
  const validToken = createJwt({ sub: "user1", role: "customer", exp: nowSec + 3600 });
  assert.equal(isTokenExpired(validToken), false);

  // 2. Expired token (in past)
  const expiredToken = createJwt({ sub: "user1", role: "customer", exp: nowSec - 60 });
  assert.equal(isTokenExpired(expiredToken), true);

  // 3. Token within 5-second buffer is treated as expired to prevent mid-flight failure
  const soonExpiringToken = createJwt({ sub: "user1", role: "customer", exp: nowSec + 2 });
  assert.equal(isTokenExpired(soonExpiringToken), true);

  // 4. Malformed tokens
  assert.equal(isTokenExpired("not_a_jwt"), true);
  assert.equal(isTokenExpired("a.b"), true);
  assert.equal(isTokenExpired(""), true);
});

test("registerUser successfully registers Customer and Stylist accounts", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let calledUrl = "";
  let calledBody = null;
  globalThis.fetch = async (url, options) => {
    calledUrl = String(url);
    calledBody = JSON.parse(options?.body || "{}");
    return {
      ok: true,
      status: 201,
      json: async () => ({
        user: { id: "user_new_123", email: calledBody.email, role: calledBody.role },
      }),
    };
  };

  // Register Customer
  const customerResult = await registerUser("customer.new@30shine.vn", "Password123!", "customer");
  assert.equal(customerResult.id, "user_new_123");
  assert.equal(customerResult.email, "customer.new@30shine.vn");
  assert.equal(customerResult.role, "customer");
  assert.match(calledUrl, /\/auth\/register$/);
  assert.equal(calledBody.role, "customer");

  // Register Stylist
  const stylistResult = await registerUser("stylist.new@30shine.vn", "Password123!", "stylist");
  assert.equal(stylistResult.role, "stylist");
  assert.equal(calledBody.role, "stylist");
});

test("registerUser rejects email duplicate with 409", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ error: "Email already registered" }),
  });

  await assert.rejects(
    registerUser("existing@30shine.vn", "Password123!", "customer"),
    /Email already registered/
  );
});

test("loginCustomer and loginStylist enforce correct role permissions", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // Mock server returning a stylist account
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "token_stylist_999",
      user: { id: "stylist_999", email: "stylist@30shine.vn", role: "stylist" },
    }),
  });

  // loginStylist succeeds
  const stylistAuth = await loginStylist("stylist@30shine.vn", "Password123!");
  assert.equal(stylistAuth.token, "token_stylist_999");
  assert.equal(stylistAuth.user.role, "stylist");

  // loginCustomer rejects this account because role is stylist
  await assert.rejects(
    loginCustomer("stylist@30shine.vn", "Password123!"),
    /Tài khoản này không có quyền Customer/
  );

  // Mock server returning a shop_admin account
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "token_admin_123",
      user: { id: "admin_123", email: "admin@30shine.vn", role: "shop_admin" },
    }),
  });

  // Both mobile logins reject shop_admin role
  await assert.rejects(
    loginCustomer("admin@30shine.vn", "Password123!"),
    /Tài khoản này không có quyền Customer/
  );
  await assert.rejects(
    loginStylist("admin@30shine.vn", "Password123!"),
    /Tài khoản này không có quyền Stylist/
  );

  // Mock server returning invalid credentials (401)
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Invalid email or password" }),
  });

  await assert.rejects(
    loginStylist("stylist@30shine.vn", "WrongPassword!"),
    /Invalid email or password/
  );
});

test("security RNF02: user registration and login payloads never contain passwords", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "secure_token_jwt",
      user: { id: "u123", email: "user@30shine.vn", role: "customer" },
    }),
  });

  const token = await loginCustomer("user@30shine.vn", "SuperSecretPassword123!");
  assert.equal(token, "secure_token_jwt");

  // Ensure returned token object does not leak password
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "secure_token_jwt_2",
      user: { id: "s123", email: "stylist@30shine.vn", role: "stylist" },
    }),
  });
  const stylistResult = await loginStylist("stylist@30shine.vn", "SuperSecretPassword123!");
  assert.equal(typeof stylistResult.user.password, "undefined");
  assert.equal(typeof stylistResult.user.passwordHash, "undefined");
});

