# Customer Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Customer account page and editable, persistent profile with optional home address.

**Architecture:** Auth Service owns profile fields on `CustomerAccount` and exposes authenticated GET/PATCH routes. The Expo Customer area presents a public account page and a protected profile/editor, returning to the profile after phone login or registration.

**Tech Stack:** Node.js, Express, Mongoose, node:test, Expo Router, React Native, TypeScript, expo-image-picker, expo-image-manipulator.

**Spec:** `docs/superpowers/specs/2026-10-21-customer-profile-design.md`

## Global Constraints

- Home remains public; profile requires a valid Customer JWT with matching `authVersion`.
- Email, birth date, avatar and home address are optional. Home address is complete only when all four fields exist.
- No delivery address, account deletion, workplace/frequent address, Shop or orders.
- Phone is read-only in profile; password and internal auth fields never appear in profile responses.
- Avatar accepts JPEG/PNG of at most 200 KiB after client processing.

## File map

| File | Responsibility |
|---|---|
| `services/auth-service/src/customer-profile.js` | Validate and serialize profile updates. |
| `services/auth-service/src/customer-account.js` | Persist fields; wire authenticated profile routes. |
| `services/auth-service/src/app.js` | Set an explicit JSON size limit that accommodates bounded avatar payloads. |
| `services/auth-service/test/customer-profile.test.js` | Profile API authorization, validation and persistence tests. |
| `apps/mobile/src/customer/profile-api.ts` | Typed GET/PATCH requests and HTTP errors. |
| `apps/mobile/src/customer/profile-draft.ts` | Pure form validation and save-state transition so failed requests keep edits. |
| `apps/mobile/src/app/(customer)/account.tsx` | Public account landing page. |
| `apps/mobile/src/app/(customer)/profile.tsx` | Protected profile view and editing. |
| `apps/mobile/src/app/(customer)/home.tsx` | Pressable name/avatar. |
| `apps/mobile/src/app/(customer)/_layout.tsx` | Account tab and hidden profile route. |
| `apps/mobile/src/app/login.tsx` | `next=profile` return path. |
| `apps/mobile/test/customer-profile.test.mjs` | Pure routing and API behavior tests. |

## Review Focus

1. Missing/expired/revoked Customer token must yield 401 and no profile data; Task 1 tests this.
2. Partial home address must yield 400 without modifying the stored address; Task 1 tests this.
3. Oversized or unsupported avatar must yield 400/413 without changing the stored image; Task 2 tests this.
4. A Customer must never change phone/auth fields through PATCH; Task 1 tests unknown keys.
5. Failed profile save must preserve mobile form values and present retry; Task 4 tests the draft-state transition and screen wiring.

---

### Task 1: Protected profile data and address

**Files:** Create `services/auth-service/src/customer-profile.js`, `services/auth-service/test/customer-profile.test.js`; modify `services/auth-service/src/customer-account.js`, `services/auth-service/package.json`.

**Interfaces:** `validateProfilePatch(body) -> { name?, email?, birthDate?, homeAddress? } | null`; `publicProfile(account) -> { id, name, phone, email, birthDate, homeAddress, avatar }`; `customers.updateProfile(id, fields) -> account`.

The core acceptance assertion uses the actual HTTP boundary:

```js
const response = await fetch(`${base}/auth/customer/profile`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ homeAddress: {
    province: "Hà Nội", district: "Ba Đình", ward: "Điện Biên", streetAddress: "12 A"
  } })
});
assert.equal(response.status, 200);
assert.equal((await response.json()).homeAddress.ward, "Điện Biên");
```

- [ ] **Step 1: Write failing API tests.** Register one Customer via OTP. GET without Bearer returns 401; GET with valid Bearer returns current name/phone and null optional fields. PATCH with `{homeAddress:{province:'Hà Nội',district:'Ba Đình',ward:'Điện Biên',streetAddress:'12 A'}}` returns 200 and subsequent GET preserves it. PATCH with a missing ward, future birth date or `phone` key returns 400; GET still returns the prior address.
- [ ] **Step 2: Run `node --test test/customer-profile.test.js` from `services/auth-service`; verify failure because routes are absent.**
- [ ] **Step 3: Implement the validator and serializer.** Normalize optional email to lowercase, validate `YYYY-MM-DD` and nonfuture date, validate all four trimmed address fields or `null`; reject unknown keys and empty PATCH. Add optional schema fields and repository `updateProfile` using `$set`/`$unset` only for allowed fields. Add GET/PATCH routes that verify JWT role/customer id/`authVersion` as `/introspect` does, set `Cache-Control: no-store`, and return 401/400/200 respectively. Route authorization must derive the account id from `jwt.verify(token, secret, { algorithms: ["HS256"] }).sub`, never a request body or query id.
- [ ] **Step 4: Run `node --test test/customer-profile.test.js` and `npm test` in `services/auth-service`; expect all pass.**
- [ ] **Step 5: Review diff and commit the task, if Git metadata is writable.**

### Task 2: Bounded avatar data

**Files:** Modify `services/auth-service/src/customer-profile.js`, `services/auth-service/src/customer-account.js`, `services/auth-service/src/app.js`, `services/auth-service/test/customer-profile.test.js`.

**Interfaces:** `avatar` is `null` or a `data:image/jpeg;base64,...` / `data:image/png;base64,...` string representing at most 204800 decoded bytes.

- [ ] **Step 1: Add failing tests.** PATCH a small valid PNG data URI and confirm GET returns it. PATCH `data:image/svg+xml`, malformed base64 and a 204801-byte PNG; expect 400/413 and the old image remains. PATCH `avatar:null`; expect GET `avatar:null`.
- [ ] **Step 2: Run the targeted test; verify avatar cases fail before code.**
- [ ] **Step 3: Add strict MIME/base64/decoded-size validation and atomic update.** Verify PNG/JPEG magic bytes agree with the declared MIME type, reject noncanonical base64, and check `Buffer.from(payload, "base64").length <= 204800`. Increase Express JSON limit to `300kb` while keeping route validation at 200 KiB decoded.
- [ ] **Step 4: Run targeted test and `npm test` in `services/auth-service`; expect all pass.**
- [ ] **Step 5: Review diff and commit if permitted.**

### Task 3: Customer account navigation

**Files:** Modify `apps/mobile/src/app/(customer)/home.tsx`, `_layout.tsx`, `apps/mobile/src/app/login.tsx`; create `apps/mobile/src/app/(customer)/account.tsx`, `apps/mobile/src/customer/profile-navigation.ts`, `apps/mobile/test/customer-profile.test.mjs`.

**Interfaces:** `profileDestination(hasToken: boolean) -> '/(customer)/profile' | '/login?next=profile'`; `customerLanding(next?: string) -> '/(customer)/profile' | '/(customer)/book' | '/(customer)/home'`.

```ts
export const profileDestination = (hasToken: boolean) =>
  hasToken ? "/(customer)/profile" : "/login?next=profile";
export const customerLanding = (next?: string) =>
  next === "profile" ? "/(customer)/profile" :
  next === "book" ? "/(customer)/book" : "/(customer)/home";
```

- [ ] **Step 1: Write failing pure navigation tests.** Assert guest account entry targets login with `next=profile`, authenticated entry targets profile, and login/register/reset with `next=profile` lands on profile while `next=book` still lands on book.
- [ ] **Step 2: Run `node --test test/customer-profile.test.mjs` in `apps/mobile`; verify missing module/functions failure.**
- [ ] **Step 3: Add the navigation helpers and use them in `login.tsx`.** Make Home name/avatar one accessible Pressable routing to account. Add an Account tab with GUEST or Customer summary, profile/address entry, existing appointment link, login CTA for guests and logout for signed-in Customer. Register profile as a hidden tab route and ensure public Account access under Customer role.
- [ ] **Step 4: Run targeted test, `npm test` and `npm run typecheck` in `apps/mobile`; expect all pass.**
- [ ] **Step 5: Review diff and commit if permitted.**

### Task 4: Profile API and editor

**Files:** Create `apps/mobile/src/customer/profile-api.ts`, `apps/mobile/src/customer/profile-draft.ts`, `apps/mobile/src/app/(customer)/profile.tsx`; modify `apps/mobile/src/providers/auth-provider.tsx`, `apps/mobile/test/customer-profile.test.mjs`, `apps/mobile/package.json` and lockfile.

**Interfaces:** `getCustomerProfile(token) -> Promise<CustomerProfile>`; `updateCustomerProfile(token, patch) -> Promise<CustomerProfile>`; `CustomerProfile` carries id/name/phone and nullable email/birthDate/avatar/homeAddress. `validateProfileDraft(draft) -> string | null` returns a visible error message or null. `saveProfileDraft(draft, send) -> Promise<{draft, error}>` preserves the original draft if `send` rejects.

```ts
export type HomeAddress = { province: string; district: string; ward: string; streetAddress: string };
export type CustomerProfile = {
  id: string; name: string; phone: string; email: string | null;
  birthDate: string | null; avatar: string | null; homeAddress: HomeAddress | null;
};
```

- [ ] **Step 1: Write failing API and draft tests.** Stub fetch at the HTTP boundary; assert Authorization header, GET/PATCH paths, profile decoding, and 401/error propagation. Assert `validateProfileDraft` accepts no address, rejects one missing address part, and accepts four parts. Assert save helper rejection returns the original draft so the screen can retain inputs and show retry.
- [ ] **Step 2: Run targeted tests; verify failure from missing API/editor behavior.**
- [ ] **Step 3: Implement API and profile screen.** GET on focus, show loading/error/retry, read-only phone, optional fields, four manual home address inputs and save state. Keep draft on failure; refresh displayed profile on success. Handle 401 by clearing Customer session and routing to `/login?next=profile`. Add image picker/manipulator, reduce photo to JPEG/PNG <=200 KiB, show preview and allow removal; ensure permission denial leaves draft unchanged.
- [ ] **Step 4: Run targeted test, `npm test`, `npm run typecheck` and `npm run export:android` in `apps/mobile`; expect all pass.**
- [ ] **Step 5: Review diff and commit if permitted.**

### Task 5: Documentation and end-to-end audit

**Files:** Modify `services/auth-service/README.md`, `apps/mobile/README.md`, `docs/adr/0009-customer-profile-and-home-address.md`, `docs/superpowers/specs/2026-10-21-customer-profile-design.md`.

**Interfaces:** Document final GET/PATCH request/response, avatar and address validation, guest redirect, and optional-field behavior.

- [ ] **Step 1: Compare each acceptance criterion in the spec with actual code and tests.** Fix gaps through failing tests before implementation changes.
- [ ] **Step 2: Update docs with the implemented API and UI flows; mark ADR accepted only after code is verified.**
- [ ] **Step 3: Run full `npm test` for Auth Service and Mobile, Mobile `npm run typecheck`, `npm run export:android`; run any integration tests whose database prerequisite is available. Inspect all exit codes and test counts.**
- [ ] **Step 4: Check `git diff --check` and `git status --short`; report any environment limitation and remaining manual device check explicitly.**

## Implementation record — 2026-10-21

- Auth Service unit suite: 26 passing tests, including profile authorization, optional address, validation and avatar boundaries.
- Auth Service MongoDB integration suite: 14 passing tests, including profile reload after opening a new connection.
- Mobile suite: 27 passing tests; TypeScript check passed.
- Android Expo export completed; this verifies Metro/Hermes bundling, not interactive device behavior.
- `git diff --check` passed. Files remain uncommitted in the shared workspace; no emulator or `adb` device was available for manual UI inspection.

