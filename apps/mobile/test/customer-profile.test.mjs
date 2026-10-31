import assert from "node:assert/strict";
import test from "node:test";
import { profileDestination, customerLanding } from "../src/customer/profile-navigation.ts";
import { getCustomerProfile, updateCustomerProfile, validateProfileDraft, saveProfileDraft } from "../src/customer/profile-api.ts";
import { formatBirthDate, toBirthDate, provinces, wardsForProvince } from "../src/customer/profile-options.ts";

test("guest account entry requests login and returns to profile", () => {
  assert.equal(profileDestination(false), "/login?next=profile");
  assert.equal(profileDestination(true), "/(customer)/profile");
  assert.equal(customerLanding("profile"), "/(customer)/profile");
  assert.equal(customerLanding("book"), "/(customer)/book");
  assert.equal(customerLanding(), "/(customer)/home");
});

test("profile API sends Customer token and surfaces unauthorized response", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => ({ id: "customer-1", name: "An", phone: "+84912345678",
      email: null, birthDate: null, avatar: null, homeAddress: null }) };
  };
  assert.equal((await getCustomerProfile("token-1")).name, "An");
  await updateCustomerProfile("token-1", { name: "Bình" });
  assert.match(calls[0].url, /\/auth\/customer\/profile$/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-1");
  assert.equal(calls[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: "Bình" });
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "Invalid token" }) });
  await assert.rejects(getCustomerProfile("bad"), (error) => error.status === 401);
});

test("profile draft accepts no address, rejects partial address and survives failed save", async () => {
  const draft = { name: "An", email: "", birthDate: "", avatar: null,
    homeAddress: { province: "", district: "", ward: "", streetAddress: "" } };
  assert.equal(validateProfileDraft(draft), null);
  const partial = { ...draft, homeAddress: { ...draft.homeAddress, province: "Hà Nội" } };
  assert.match(validateProfileDraft(partial), /địa chỉ/i);
  const full = { ...draft, homeAddress: { province: "Hà Nội", district: "Ba Đình", ward: "Điện Biên", streetAddress: "12 A" } };
  assert.equal(validateProfileDraft(full), null);
  const result = await saveProfileDraft(full, async () => { throw new Error("Mất kết nối"); });
  assert.deepEqual(result.draft, full);
  assert.match(result.error, /Mất kết nối/);
});

test("birth date is selected as day-month-year while API keeps ISO format", () => {
  assert.equal(formatBirthDate("2000-02-29"), "29-02-2000");
  assert.equal(toBirthDate(29, 2, 2000), "2000-02-29");
  assert.equal(toBirthDate(29, 2, 2001), null);
});

test("34 provinces filter current wards directly", () => {
  assert.equal(provinces.length, 34);
  assert.equal(provinces.reduce((count, province) => count + wardsForProvince(province).length, 0), 3321);
  assert.ok(wardsForProvince("Hà Nội").includes("Ba Đình"));
  assert.ok(!wardsForProvince("Hồ Chí Minh").includes("Ba Đình"));
});

test("new address needs province, ward and street but no district", () => {
  const draft = { name: "An", email: "", birthDate: "", avatar: null,
    homeAddress: { province: "Hà Nội", district: "", ward: "Ba Đình", streetAddress: "12 A" } };
  assert.equal(validateProfileDraft(draft), null);
});
