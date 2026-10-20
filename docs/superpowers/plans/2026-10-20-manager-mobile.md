# Manager Mobile and Admin Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cùng một app Expo phục vụ Customer, Stylist và General Manager; Admin Web chỉ phục vụ System Admin.

**Architecture:** AuthProvider giữ JWT nhân sự và định tuyến theo role, Expo Router thêm nhóm `(manager)` với bốn tab. Manager dùng adapter HTTP riêng, các mutation gọi catalog/work shift API sẵn có; Customer dùng pay API của [plan Core](2026-10-20-manager-core-api.md). Web bỏ nhánh giao diện Manager sau khi mobile vận hành được.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo Router, TypeScript, React 19, Vite React Admin Web, `node:test`.

**Spec:** [Manager mobile design](../specs/2026-10-20-manager-mobile-design.md). **Prerequisite:** hoàn thành [Manager Core API](2026-10-20-manager-core-api.md) trước Task 2–5.

## Global Constraints

- Một app Expo cho `customer`, `stylist`, `general_manager`; `system_admin` chỉ vào Admin Web.
- Manager có quyền mọi chi nhánh, chỉ xem/lọc Appointment; không tạo User, không đổi trạng thái Appointment, không xem audit/health.
- Bốn tab Manager: Tổng quan, Lịch đặt, Vận hành, Thanh toán; date mặc định `Asia/Ho_Chi_Minh`.
- Payment UI ghi đúng **Thanh toán mô phỏng, không trừ tiền thật.** Chỉ Customer sở hữu lịch `completed` thử `momo`/`vnpay` demo.
- Mọi mutation Manager cần mạng, có loading/lỗi/retry thủ công, không xếp hàng ghi offline; 401 xóa phiên nhân sự.
- Giữ dữ liệu Customer hiện hữu và flow Guest Session/OTP mô phỏng; không tích hợp SMS/cổng tiền thật.

## Review Focus

1. Token Manager hết hạn hoặc bị khóa khi app mở lại phải về login, không hiện dữ liệu Manager cũ — Task 1/2.
2. Manager đang offline bấm lưu form không tạo queue, thấy lỗi và chỉ thử lại khi người dùng bấm — Task 3.
3. Bộ lọc nhiều điều kiện và phân trang phải giữ filter khi tải trang tiếp — Task 4.
4. Thử pay thất bại rồi thử lại phải tạo requestId mới, trong khi retry do mất mạng của một lần gửi giữ requestId cũ — Task 5.
5. Session Manager lưu trong Admin Web từ phiên cũ không được vào web sau nâng cấp — Task 6.

## File Map

- `apps/mobile/src/providers/auth-provider.tsx`, `role-provider.tsx`, `app/login.tsx`, `app/_layout.tsx`: chấp nhận Manager, phục hồi/loại phiên, điều hướng.
- `apps/mobile/src/manager/types.ts`, `api.ts`, `date.ts`: type, request Bearer/401, query date, CRUD catalog/work shift và API Manager.
- `apps/mobile/src/app/(manager)/_layout.tsx`, `overview.tsx`, `appointments.tsx`, `operations.tsx`, `payments.tsx`: bốn tab; chi tiết/form có thể đặt dưới `app/(manager)/...` và `href:null` để không tạo tab thừa.
- `apps/mobile/src/appointments/types.ts`, `core-api-adapter.ts`, `demo-adapter.ts`, `app/(customer)/appointments.tsx`: pay demo và giá chốt.
- `apps/admin-web/src/AdminApp.jsx`, `api.js`, `styles.css`: bỏ route/UI/api call Manager; login chỉ Admin.
- `apps/mobile/test/auth.test.mjs`, `test/manager.test.mjs`, `test/core-api-adapter.test.mjs`; `apps/admin-web` thêm `test/admin-access.test.mjs` nếu extract role guard thuần sang `src/access.js`.
- `apps/mobile/README.md`, `docs/03-thiet-ke-he-thong.md`, `docs/08-admin-web.md`, `docs/07-backlog-tracking.md`: trạng thái sau triển khai và hướng dẫn chạy.

### Task 1: Đăng nhập nhân sự và bảo vệ khu vực Manager

**Files:** Modify `src/providers/auth-provider.tsx`, `src/providers/role-provider.tsx`, `src/app/login.tsx`, `src/app/_layout.tsx`; Create `src/app/(manager)/_layout.tsx`, `src/app/(manager)/overview.tsx`; Test `test/auth.test.mjs` (đường dẫn dưới `apps/mobile`).

**Interfaces:** `AuthContextValue.role` và `MobileRole` nhận thêm `general_manager`; `staffLanding(role)` trả `/(stylist)/today` hoặc `/(manager)/overview`, không nhận `system_admin`. Các màn Manager dùng `useAuth()` để lấy token.

- [ ] **Step 1: Viết test đỏ.** Test role Manager đăng nhập giữ token, `staffLanding("general_manager") === "/(manager)/overview"`; Admin login từ mobile bị từ chối không lưu token; logout xóa token/role; session Manager đã lưu nhưng introspect 401 thì xóa session. Extract `staffLanding`/`isMobileStaffRole` sang `src/providers/auth-utils.ts` để Node test trực tiếp.

```js
assert.equal(staffLanding("general_manager"), "/(manager)/overview");
assert.equal(isMobileStaffRole("system_admin"), false);
assert.equal(isMobileStaffRole("stylist"), true);
```
- [ ] **Step 2: Chạy đỏ.** `cd apps/mobile; node --test test/auth.test.mjs` → FAIL vì helper/role chưa có.
- [ ] **Step 3: Sửa tối thiểu.** `login()` cho `stylist || general_manager`, chặn Admin trước AsyncStorage; phục hồi staff token phải gọi `/auth/introspect` (cùng contract Auth hiện có) trước `setUser`, 401 xóa AsyncStorage. `login.tsx` route theo helper sau login và hydration. `(manager)/_layout.tsx` guard cả `auth.role === "general_manager"` và `roleProvider.role === "general_manager"`, render bốn Tabs. `overview.tsx` tạm render trạng thái tải/empty để nhóm route hợp lệ; Task 4 điền data.

```ts
export const isMobileStaffRole = (role: string): role is "stylist" | "general_manager" =>
  role === "stylist" || role === "general_manager";
export const staffLanding = (role: "stylist" | "general_manager") =>
  role === "stylist" ? "/(stylist)/today" : "/(manager)/overview";
```
- [ ] **Step 4: Chạy xanh.** `npm test; npm run typecheck` trong `apps/mobile`, kiểm tra Customer và Stylist còn vào đúng khu vực.
- [ ] **Step 5: Commit.** `git add apps/mobile/src apps/mobile/test && git commit -m "feat(mobile): route manager staff sessions"`.

### Task 2: Adapter HTTP và types Manager

**Files:** Create `src/manager/types.ts`, `src/manager/api.ts`, `src/manager/date.ts`, `test/manager.test.mjs`; Modify `src/constants/config.ts` nếu dùng chung Core URL.

**Interfaces:** `createManagerApi(getToken, onUnauthorized, baseUrl)` trả `overview(filters)`, `appointments(filters)`, `appointment(id)`, `payments(filters)`, `branches/list/create/update/delete`, `services/list/create/update/delete`, `stylists/list/create/update/delete`, `shifts/list/create/update/delete`. Types dùng response của plan Core; `managerToday()` trả `YYYY-MM-DD` tại `Asia/Ho_Chi_Minh`.

- [ ] **Step 1: Viết test đỏ.** Mock fetch assert GET `/manager/appointments?date=2030-10-21&branchId=...&status=booked&limit=20`, Authorization Bearer và `encodeURIComponent`; response 401 gọi `onUnauthorized` một lần; network failure ra thông báo Việt; `managerToday(new Date("2030-10-20T17:01:00Z"))` trả `2030-10-21`; API `payments` thiếu branchId chặn tại client.

```js
assert.equal(managerToday(new Date("2030-10-20T17:01:00Z")), "2030-10-21");
await api.appointments({ date: "2030-10-21", status: "booked", limit: 20 });
assert.match(lastUrl, /date=2030-10-21.*status=booked.*limit=20/);
assert.equal(lastHeaders.Authorization, "Bearer manager-token");
```
- [ ] **Step 2: Chạy đỏ.** `cd apps/mobile; node --test test/manager.test.mjs` → FAIL vì adapter chưa có.
- [ ] **Step 3: Sửa tối thiểu.** Dùng helper `request<T>(path, init)` lấy token hiện tại mỗi request, parse JSON error, `if (response.status === 401) { onUnauthorized(); throw new Error("Phiên đã hết hạn."); }`; xây query bằng `URLSearchParams`, chỉ append filter có giá trị. Dùng `Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"})` hoặc `formatToParts` để trả ngày ổn định. Tái dùng đúng path/payload catalog và work shift đang có trong `apps/admin-web/src/api.js`; không tạo endpoint mới.

```ts
const query = new URLSearchParams();
for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== "") query.set(key, String(value));
const response = await fetch(`${baseUrl}/manager/appointments?${query}`, {
  headers: { Authorization: `Bearer ${getToken()}` },
});
if (response.status === 401) { onUnauthorized(); throw new Error("Phiên đã hết hạn."); }
```
- [ ] **Step 4: Chạy xanh.** `npm test; npm run typecheck` trong `apps/mobile`.
- [ ] **Step 5: Commit.** `git add apps/mobile/src/manager apps/mobile/test/manager.test.mjs apps/mobile/src/constants/config.ts && git commit -m "feat(mobile): add manager API client"` (chỉ stage config nếu đã sửa).

### Task 3: Tab Vận hành cho catalog và phân ca

**Files:** Modify `src/app/(manager)/operations.tsx`; Create `src/manager/operations-model.ts`, `src/app/(manager)/branch-form.tsx`, `service-form.tsx`, `stylist-form.tsx`, `shift-form.tsx`; Test `test/manager.test.mjs`.

**Interfaces:** Adapter Task 2. `validateShiftDraft({stylistId,branchId,startAt,endAt})` trả lỗi cụ thể hoặc null; `save` chỉ gọi API sau khi connectivity báo online, không gọi `enqueue` trong `src/offline`.

- [ ] **Step 1: Viết test đỏ.** Assert form service giá âm/duration 0 bị chặn; ca endAt <= startAt bị chặn; stylist chưa có userId bị chặn; offline save không gọi API; mutation lỗi giữ draft, success làm mới danh sách. Test các hàm pure trong `operations-model.ts`; cho UI kiểm thử thủ công trên emulator vì repo không có React Native component test renderer.

```js
assert.match(validateServiceDraft({ name: "Cắt", price: -1, durationMinutes: 30 }), /giá/i);
assert.match(validateShiftDraft({ stylistId: "s", branchId: "b", startAt: "2030-01-01T10:00:00Z", endAt: "2030-01-01T09:00:00Z" }), /kết thúc/i);
assert.equal(canSubmitMutation("offline"), false);
```
- [ ] **Step 2: Chạy đỏ.** `cd apps/mobile; node --test test/manager.test.mjs` → FAIL ở validator/model.
- [ ] **Step 3: Sửa tối thiểu.** `operations.tsx` có chọn branch, phân đoạn Branch/Service/Stylist/Shift, card list, nút tạo/sửa/xóa có confirm; form riêng validate và gọi API Task 2. Gán thợ cần userId Stylist do Admin tạo, không có tạo tài khoản. Ca có lọc ngày/branch/stylist, start/end rõ timezone, khớp contract Core. Dùng `useConnectivity()` như Customer screen; offline hiển thị lỗi, `return` trước API; chỉ `setRevision(n=>n+1)` sau mutation thành công. Chặn double submit bằng `busy`.

```ts
export const canSubmitMutation = (connectivity: "online" | "offline" | "unknown") => connectivity !== "offline";
export const validateServiceDraft = (draft: { name: string; price: number; durationMinutes: number }) =>
  !draft.name.trim() ? "Cần tên dịch vụ" : draft.price < 0 ? "Giá không hợp lệ" :
  draft.durationMinutes <= 0 ? "Thời lượng không hợp lệ" : null;
```
- [ ] **Step 4: Chạy xanh.** `npm test; npm run typecheck; npm run export:android` trong `apps/mobile`; trên emulator kiểm tra tạo/sửa/xóa branch/service/profile/shift và lỗi mạng.
- [ ] **Step 5: Commit.** `git add apps/mobile/src apps/mobile/test && git commit -m "feat(mobile): manage catalog and shifts"`.

### Task 4: Tab Tổng quan, Lịch đặt và Thanh toán

**Files:** Modify `src/app/(manager)/overview.tsx`, `appointments.tsx`, `payments.tsx`; Create `src/app/(manager)/appointment-detail.tsx`, `src/manager/filters.ts`; Test `test/manager.test.mjs`.

**Interfaces:** `buildAppointmentQuery(filters,cursor)` giữ filter khi sang trang; `buildPaymentQuery({branchId,from,to,cursor})` yêu cầu branchId. Các screen chỉ gọi GET từ Task 2.

- [ ] **Step 1: Viết test đỏ.** `buildAppointmentQuery` phải giữ cả date/branch/stylist/status khi có cursor; `buildPaymentQuery` lỗi nếu thiếu branch hoặc from > to. Kiểm tra overview counts đúng 4 trạng thái, payment list giữ failed và `simulatedTotal` dùng response server, không tự cộng trang hiện tại. Test từ `manager/filters.ts` và adapter mock.

```js
assert.equal(buildAppointmentQuery({ date: "2030-10-21", branchId: "b1", status: "paid" }, "next"),
  "date=2030-10-21&branchId=b1&status=paid&cursor=next");
assert.throws(() => buildPaymentQuery({ branchId: "", from: "2030-10-20", to: "2030-10-21" }), /chi nhánh/i);
```
- [ ] **Step 2: Chạy đỏ.** `cd apps/mobile; node --test test/manager.test.mjs` → FAIL ở filter helper.
- [ ] **Step 3: Sửa tối thiểu.** Overview default ngày VN, chọn all/branch, counts và link nhanh. Appointments có filter thu gọn, list/card phân trang và chi tiết với customerPhone chỉ ở detail; không render action complete/cancel/pay. Payments buộc chọn branch, date range, attempt success/failed, tổng thu mô phỏng và copy **Thanh toán mô phỏng, không trừ tiền thật.** Trạng thái loading/empty/error + nút thử lại trên cả ba screen. Khi filter thay đổi reset cursor/items; load-more dùng query hiện tại, tránh response cũ ghi đè bằng request sequence hoặc cleanup.

```ts
export function buildAppointmentQuery(filters: Record<string, string>, cursor?: string) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)));
  if (cursor) query.set("cursor", cursor);
  return query.toString();
}
```
- [ ] **Step 4: Chạy xanh.** `npm test; npm run typecheck; npm run export:android`; kiểm tra trên emulator filter, chi tiết, pagination, payment fail/success, lỗi mạng.
- [ ] **Step 5: Commit.** `git add apps/mobile/src apps/mobile/test && git commit -m "feat(mobile): show manager schedule and payments"`.

### Task 5: Customer payment demo theo contract mới

**Files:** Modify `src/appointments/types.ts`, `core-api-adapter.ts`, `demo-adapter.ts`, `src/app/(customer)/appointments.tsx`; Test `test/core-api-adapter.test.mjs`, `test/appointments.test.mjs`.

**Interfaces:** `CustomerAppointmentDataSource.pay(id, {provider,outcome,requestId}): Promise<{appointment: CustomerAppointment; attempt: PaymentAttempt}>`. Giá chốt từ Appointment `bookedPrice`; Customer screen lấy `result.appointment.status` và `result.attempt.status`.

- [ ] **Step 1: Viết test đỏ.** Assert request body provider/outcome/requestId; failed giữ `completed`, UI thể hiện thử lại; success ra `paid`. Thử lại chủ ý tạo requestId mới; retry cùng lần gửi sau lỗi network giữ requestId cũ. Response lỗi lịch cũ thiếu giá hiển thị rõ.

```js
await source.pay("a1", { provider: "momo", outcome: "failed", requestId: "attempt-1" });
assert.deepEqual(JSON.parse(lastBody), { provider: "momo", outcome: "failed", requestId: "attempt-1" });
assert.equal((await source.list())[0].status, "completed");
```
- [ ] **Step 2: Chạy đỏ.** `cd apps/mobile; node --test test/core-api-adapter.test.mjs test/appointments.test.mjs` → FAIL vì pay hiện không nhận body.
- [ ] **Step 3: Sửa tối thiểu.** Màn Customer chọn MoMo/VNPay và kết quả demo rõ ràng, hiển thị `bookedPrice` và copy không trừ tiền thật. Tạo `requestId` một lần cho mỗi hành động, giữ trong state cho retry lỗi mạng; sau response failed, reset để attempt kế tiếp có ID mới. Demo adapter ghi attempt tương ứng để UX demo không khác contract server. Không tự động gửi lại mutation khi offline.

```ts
const response = await request<{ appointment: CustomerAppointment; attempt: PaymentAttempt }>(
  `/appointments/${encodeURIComponent(id)}/pay`,
  { method: "POST", body: JSON.stringify({ provider, outcome, requestId }) },
);
return response;
```
- [ ] **Step 4: Chạy xanh.** `npm test; npm run typecheck; npm run export:android`; kiểm tra flow Stylist complete → Customer failed → success → Manager thấy hai attempts.
- [ ] **Step 5: Commit.** `git add apps/mobile/src apps/mobile/test && git commit -m "feat(mobile): simulate customer payment attempts"`.

### Task 6: Admin Web chỉ còn System Admin và cập nhật hướng dẫn

**Files:** Modify `apps/admin-web/src/AdminApp.jsx`, `src/api.js`, `src/styles.css`, `apps/mobile/README.md`, `docs/03-thiet-ke-he-thong.md`, `docs/08-admin-web.md`, `docs/07-backlog-tracking.md`; Create `apps/admin-web/src/access.js`, `test/admin-access.test.mjs`; Modify `apps/admin-web/package.json` để có script test nếu cần.

**Interfaces:** `canUseAdminWeb(role) => role === "system_admin"`. Manager bị từ chối cả phiên cache lẫn login mới; SystemAdminApp giữ đủ CRUD staff, health, audit.

- [ ] **Step 1: Viết test đỏ.** `canUseAdminWeb("general_manager")` false và `("system_admin")` true; cached manager session phải bị clear trước render; kiểm tra Login copy chỉ System Admin. Kiểm tra bằng test thuần và build vì repo chưa có UI test framework.

```js
assert.equal(canUseAdminWeb("general_manager"), false);
assert.equal(canUseAdminWeb("system_admin"), true);
assert.equal(canUseAdminWeb("stylist"), false);
```
- [ ] **Step 2: Chạy đỏ.** `cd apps/admin-web; node --test test/admin-access.test.mjs` → FAIL vì helper chưa có.
- [ ] **Step 3: Sửa tối thiểu.** Rút `AdminApp.jsx` còn Login + `SystemAdminApp`; xóa code/component Manager và lời giới thiệu hai role; cached session role khác Admin bị `sessionStorage.removeItem`. Bỏ API Manager không dùng trong `api.js` sau khi xác nhận `SystemAdminApp` không gọi. Cập nhật docs/README chính xác route và lệnh mở app/web, backlog đánh dấu phần đã triển khai thay vì mục tiêu.

```js
export const canUseAdminWeb = (role) => role === "system_admin";
const saved = cached();
if (saved && !canUseAdminWeb(saved.user?.role)) sessionStorage.removeItem("shine-admin-session");
```
- [ ] **Step 4: Chạy xanh.** `node --test test/admin-access.test.mjs; npm run build` tại `apps/admin-web`; chạy `npm test; npm run typecheck; npm run export:android` tại `apps/mobile`; smoke test Manager bị web từ chối, Admin vào web, Manager vào Expo.
- [ ] **Step 5: Commit.** `git add apps/admin-web apps/mobile/README.md docs/03-thiet-ke-he-thong.md docs/08-admin-web.md docs/07-backlog-tracking.md && git commit -m "feat(admin-web): reserve web for system admin"`.

## Acceptance Gate

Sau Task 6, chạy Core unit/integration, Mobile test/typecheck/Android export và Admin Web build. Trên emulator thử full flow Admin tạo nhân sự → Manager cấu hình → Customer đặt → Stylist hoàn thành → Customer failed/success → Manager xem lịch sử. Kiểm tra `git status --short`, diff role guard, và không có chức năng Manager trên Web hoặc chức năng Admin trong mobile.
