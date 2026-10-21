const { normalizeName } = require("./customer-guest");

const ADDRESS_FIELDS = ["province", "district", "ward", "streetAddress"];
const PROFILE_FIELDS = ["name", "email", "birthDate", "homeAddress", "avatar"];
const MAX_AVATAR_BYTES = 200 * 1024;

function validAvatar(value) {
  if (typeof value !== "string") return false;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES || bytes.toString("base64") !== match[2]) return false;
  return match[1] === "png"
    ? bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

function validateProfilePatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !PROFILE_FIELDS.includes(key))) return null;
  const result = {};
  if ("name" in body) {
    const name = normalizeName(body.name);
    if (!name) return null;
    result.name = name;
  }
  if ("email" in body) {
    if (body.email !== null && typeof body.email !== "string") return null;
    const email = body.email === null ? null : body.email.trim().toLowerCase();
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
    result.email = email || null;
  }
  if ("birthDate" in body) {
    if (body.birthDate !== null && !validDate(body.birthDate)) return null;
    result.birthDate = body.birthDate;
  }
  if ("homeAddress" in body) {
    const value = body.homeAddress;
    if (value === null) result.homeAddress = null;
    else {
      if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).length !== ADDRESS_FIELDS.length ||
        Object.keys(value).some((key) => !ADDRESS_FIELDS.includes(key))) return null;
      const address = {};
      for (const field of ADDRESS_FIELDS) {
        if (typeof value[field] !== "string") return null;
        const trimmed = value[field].trim().replace(/\s+/g, " ");
        if ((!trimmed && field !== "district") || trimmed.length > 120) return null;
        address[field] = trimmed;
      }
      result.homeAddress = address;
    }
  }
  if ("avatar" in body) {
    if (body.avatar !== null && !validAvatar(body.avatar)) return null;
    result.avatar = body.avatar;
  }
  return result;
}

function publicProfile(account) {
  return {
    id: String(account._id), name: account.name, phone: account.phone,
    email: account.email || null, birthDate: account.birthDate || null,
    avatar: account.avatar || null, homeAddress: account.homeAddress?.province ? {
      province: account.homeAddress.province, district: account.homeAddress.district,
      ward: account.homeAddress.ward, streetAddress: account.homeAddress.streetAddress,
    } : null,
  };
}

module.exports = { validateProfilePatch, publicProfile };
