# Manager Core API Implementation Plan

> **Trạng thái:** Code và kiểm thử Core/Mongo của kế hoạch đã triển khai trên nhánh `shine-26-role-based-access-system-administration`. Checklist bên dưới giữ nguyên như bản kế hoạch ban đầu.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chốt giá lúc đặt, ghi mọi lần thanh toán mô phỏng và cung cấp API chỉ đọc cho Manager trên mọi chi nhánh.

**Architecture:** Booking vẫn nằm trong `stylist_calendars`. Payment Attempt là subdocument của Appointment; một cập nhật có điều kiện trên calendar ghi attempt và đổi `completed` sang `paid` khi thành công. Manager đọc projection từ calendar qua service và router riêng, dùng middleware Auth hiện có.

**Tech Stack:** Node.js, Express 4, Mongoose 9, `node:test`, MongoDB standalone.

**Spec:** [Manager mobile design](../specs/2026-10-20-manager-mobile-design.md). Plan mobile phụ thuộc: [Manager mobile implementation](2026-10-20-manager-mobile.md).

## Global Constraints

- Role đúng là `general_manager`; `system_admin`, `stylist`, `customer` không được gọi `/manager/*`.
- Ngày mặc định và bộ lọc theo `Asia/Ho_Chi_Minh`; giá là VND nguyên, lấy từ Service đang hoạt động, không tin body của Customer.
- Provider chỉ `momo`/`vnpay`, outcome chỉ `success`/`failed`; không gọi cổng thật, không lưu thông tin ví hoặc thẻ.
- Một Appointment có tối đa một attempt thành công; retry cùng `requestId` trả bản ghi cũ; thiếu `bookedPrice` thì không thanh toán.
- Manager chỉ xem/lọc lịch, không chuyển trạng thái; tổng thu mô phỏng chỉ cộng attempt `success`.
- API và OpenAPI chỉ mô tả khả năng đã thực thi; dữ liệu Customer cũ không bị xóa.

## Review Focus

1. Lịch ở sát 00:00 giờ Việt Nam phải vào đúng ngày lọc — test Task 3.
2. Filter `branchId` không được trả lịch/attempt chi nhánh khác — test Task 3.
3. Hai request cùng `requestId` phải có cùng attempt — test Task 2.
4. Hai request thành công song song khác `requestId` chỉ có một attempt thành công — integration test Task 2.
5. JWT Manager bị khóa/đổi role phải bị Auth từ chối; các role khác nhận 403 — test Task 3.

## File Map

- `services/core-api/src/work-shifts/repository.js`: trả giá và danh tính service đã xác thực khi validate slot.
- `services/core-api/src/booking/routes.js`, `service.js`, `rules.js`: truyền snapshot giá; tách action pay khỏi transition trống body.
- `services/core-api/src/models/stylist-calendar.js`, `booking/mongo-repository.js`: schema, projection, ghi payment nguyên tử.
- `services/core-api/src/manager/query.js`, `manager/service.js`, `manager/routes.js`: validate filter, phân trang, số liệu ngày và lịch sử thanh toán.
- `services/core-api/src/app.js`: mount `/manager` sau `authenticate`.
- `services/core-api/src/docs/openapi.json`, `docs/03-thiet-ke-he-thong.md`: hợp đồng và sơ đồ đúng sau khi code chạy.
- `services/core-api/test/booking.test.js`, `booking.integration.js`, `booking-contract.js`, `manager.test.js`, `manager.integration.js`, `docs.test.js`: chứng minh contract, đồng thời sửa fixture legacy để không giả vờ lịch thiếu giá có thể pay.

### Task 1: Chốt giá booking tại server

**Files:** Modify `src/work-shifts/repository.js`, `src/booking/routes.js`, `src/booking/rules.js`, `src/booking/mongo-repository.js`, `src/models/stylist-calendar.js`; Test `test/work-shifts.test.js`, `test/booking.integration.js` (đường dẫn dưới `services/core-api`).

**Interfaces:** `validateBooking(data)` trả `{ bookedPrice: number }` sau khi xác thực service/ca/thợ. `repository.book({ ...data, bookedPrice })` và `plain(appointment)` trả `branchId`, `serviceId`, `bookedPrice`.

- [ ] **Step 1: Viết test thất bại.** Test tạo service giá `120000`, gọi `POST /appointments` với `bookedPrice: 1` phải nhận 400; gọi body hợp lệ nhận `bookedPrice: 120000`; sửa service thành `150000`, `GET /appointments/customer` vẫn trả `120000`. Test `validateBooking` trả `{ bookedPrice: service.price }` sau kiểm tra ca và duration.

```js
assert.equal((await post("/appointments", customer, { ...validBody, bookedPrice: 1 })).status, 400);
const booked = await post("/appointments", customer, validBody);
assert.equal(booked.body.appointment.bookedPrice, 120000);
await Service.updateOne({ _id: validBody.serviceId }, { $set: { price: 150000 } });
assert.equal((await repository.findById(booked.body.appointment.id)).bookedPrice, 120000);
```
- [ ] **Step 2: Chạy test đỏ.** `cd services/core-api; node --test test/work-shifts.test.js test/booking.integration.js` → FAIL tại assertion snapshot giá. Integration dùng DB cấu hình trong `.env`; nếu DB không chạy, nêu rõ blocker và vẫn chạy unit test.
- [ ] **Step 3: Sửa tối thiểu.** Cuối `validateBooking` trả `return { bookedPrice: service.price };`. Route chỉ chuyển snapshot qua tham số riêng `service.book(req.auth, req.body, snapshot)`, service gọi `repository.book({ ...validateBooking(body), ...snapshot, customerId: actor.userId.toLowerCase() })`. Không cho `bookedPrice` vào allowlist body công khai. Schema thêm `bookedPrice: { type: Number, min: 0 }` để đọc lịch cũ; `plain` chiếu `branchId`, `serviceId`, `bookedPrice` khi có.

```js
const validated = validateBooking(req.body || {});
const snapshot = await workShiftRepository.validateBooking(validated);
const appointment = await service.book(req.auth, req.body, snapshot);
// In createBookingService.book(actor, body, snapshot):
return repository.book({ ...validateBooking(body), ...snapshot, customerId: actor.userId.toLowerCase() });
```
- [ ] **Step 4: Chạy xanh.** Cùng lệnh Step 2; sau đó `npm test` trong `services/core-api`. Giữ test booking legacy không có Work Shift chạy được nhưng không mặc nhận giá lịch cũ.
- [ ] **Step 5: Commit.** `git add services/core-api/src services/core-api/test && git commit -m "feat(core): snapshot service price at booking"`.

### Task 2: Payment Attempt mô phỏng và idempotency

**Files:** Modify `src/models/stylist-calendar.js`, `src/booking/rules.js`, `src/booking/service.js`, `src/booking/routes.js`, `src/booking/mongo-repository.js`; Test `test/booking.test.js`, `test/booking.integration.js`, `test/booking-contract.js`.

**Interfaces:** `POST /appointments/:id/pay` body `{ provider: "momo" | "vnpay", outcome: "success" | "failed", requestId: string }`; response `{ appointment, attempt }`. `repository.recordPayment(id, actor, input)` trả `{ appointment, attempt }` hoặc null cho CAS conflict. `plain` chiếu `paymentAttempts` chỉ trên chi tiết được phép; Manager history lấy riêng qua Task 3.

- [ ] **Step 1: Viết test thất bại.** Test booked/wrong owner/unknown provider/empty requestId → 400/403 theo thứ tự validation và ownership; completed + failed → 200, vẫn completed; retry cùng requestId → cùng `attempt.id`; success sau failed → paid; lịch cũ không giá → 409. Integration chạy hai app instance song song cho hai success requestId khác nhau, assert đúng một success và chỉ một attempt success trong DB.

```js
const input = { provider: "momo", outcome: "failed", requestId: "pay-a" };
const first = await post(`/appointments/${id}/pay`, customer, input);
const replay = await post(`/appointments/${id}/pay`, customer, input);
assert.equal(first.body.attempt.id, replay.body.attempt.id);
assert.equal(first.body.appointment.status, "completed");
const success = await post(`/appointments/${id}/pay`, customer,
  { provider: "vnpay", outcome: "success", requestId: "pay-b" });
assert.equal(success.body.appointment.status, "paid");
```
- [ ] **Step 2: Chạy test đỏ.** `cd services/core-api; node --test test/booking.test.js test/booking.integration.js` → FAIL vì pay body bị chặn/không có attempt.
- [ ] **Step 3: Sửa tối thiểu.** Schema `paymentAttempts: [{ requestId: String, branchId: ObjectId, amount: Number, provider: {type:String,enum:["momo","vnpay"]}, status: {type:String,enum:["success","failed"]}, attemptedAt: Date }]`. `validatePayment(body)` chỉ nhận `provider`, `outcome`, `requestId` (server sinh `id`). Service xác thực Customer owner/phoneVerified như action hiện hành, kiểm tra retry requestId trước trạng thái để replay success đã paid được trả lại; từ chối requestId trùng nhưng payload khác với 409. Repository dùng `findOneAndUpdate` với `$elemMatch` trên `_id`, `status:"completed"`, owner và `"paymentAttempts.requestId": {$ne: requestId}`; `$push` attempt, `$set` status khi success trong **cùng update**. Vì positional `$` và path subdocument, dùng `arrayFilters` hoặc aggregation pipeline có điều kiện, tuyệt đối không read-modify-save. Khi CAS không match, đọc lại: cùng requestId trả cũ, paid bởi request khác trả 409. Không ghi body vào audit. Trong `booking-contract.js`, thêm fake `workShiftRepository.validateBooking` trả `{bookedPrice:120000}` ở cả hai `createApp`, và thêm cặp `branchId/serviceId` vào `bodyFor`; các test pay gọi body mới. Test lịch legacy thiếu giá tạo appointment trực tiếp trong repository. Không cho pay lịch legacy thiếu giá.

```js
const attempt = { _id: new mongoose.Types.ObjectId(), requestId, branchId: appointment.branchId,
  amount: appointment.bookedPrice, provider, status: outcome, attemptedAt: new Date() };
const update = { $push: { "appointments.$.paymentAttempts": attempt },
  $set: { "appointments.$.updatedAt": new Date(),
    ...(outcome === "success" ? { "appointments.$.status": "paid" } : {}) } };
const filter = { appointments: { $elemMatch: { _id: id, status: "completed",
  customerId: actor.userId, bookedPrice: { $exists: true },
  "paymentAttempts.requestId": { $ne: requestId } } } };
const saved = await Calendar.findOneAndUpdate(filter, update,
  { returnDocument: "after", runValidators: true }).lean().exec();
```
- [ ] **Step 4: Chạy xanh.** Lệnh Step 2, rồi `npm test` tại `services/core-api`. Kiểm tra DB sau fail→success có 2 attempt, amount bằng snapshot, không phải giá Service hiện tại.
- [ ] **Step 5: Commit.** `git add services/core-api/src services/core-api/test && git commit -m "feat(core): record atomic mock payment attempts"`.

### Task 3: API đọc Manager và phân quyền

**Files:** Create `src/manager/query.js`, `src/manager/service.js`, `src/manager/routes.js`, `test/manager.test.js`, `test/manager.integration.js`; Modify `src/booking/mongo-repository.js`, `src/app.js`.

**Interfaces:** `managerRoutes(repository)` trả Express router, mount sau `authenticate(secret, verifyStaff)`. `repository.managerOverview({date,branchId})` trả `{date, counts}`; `managerAppointments({date,branchId,stylistId,status,cursor,limit})` trả `{items,nextCursor}`; `managerAppointment(id)` trả appointment projection; `managerPayments({branchId,from,to,cursor,limit})` trả `{items,nextCursor,simulatedTotal}`.

- [ ] **Step 1: Viết test thất bại.** Tạo lịch ở `2030-10-20T16:59:59Z` và `17:00:00Z`, lọc ngày `2030-10-21` chỉ lấy lịch thứ hai. Tạo hai branch: lọc một branch không lẫn lịch/attempt branch kia; `simulatedTotal` chỉ cộng success kể cả trang sau. Test kết hợp date+branch+stylist+status, cursor/limit 1 không trùng hoặc thiếu item, ID lạ 404, filter/date/limit sai 400. HTTP test Customer/Stylist/System Admin 403, Manager 200, staff verifier trả false → 401; `POST /appointments/:id/complete` từ Manager 403.

```js
const result = await get("/manager/appointments?date=2030-10-21&limit=1", manager);
assert.equal(result.status, 200);
assert.deepEqual(result.body.items.map((item) => item.startTime), ["2030-10-20T17:00:00.000Z"]);
assert.equal((await get("/manager/overview?date=2030-10-21", customer)).status, 403);
assert.equal((await get("/manager/overview?date=2030-10-21", revokedManager)).status, 401);
```
- [ ] **Step 2: Chạy test đỏ.** `cd services/core-api; node --test test/manager.test.js test/manager.integration.js` → FAIL vì route chưa có.
- [ ] **Step 3: Sửa tối thiểu.** `query.js` validate date regex + calendar date thực, ObjectId, status, limit `1..100`, cursor opaque (base64url của `{sortTime,id}`), `from <= to`; tính ngày Việt Nam bằng range UTC `[dateT-07:00, nextDateT-07:00)`. `service.js` gọi repository, chỉ nhận role `general_manager`. `routes.js` expose đúng 4 GET trong spec, dùng `requireRole("general_manager")` hoặc guard tương đương trước query. Repository dùng Mongo aggregation `$unwind: "$appointments"`, `$match` trên branch/stylist/status/startTime, sort ổn định `{startTime:-1,_id:-1}`, `$limit:limit+1`; không chiếu toàn bộ `paymentAttempts` vào danh sách lịch. Payment history unwind tiếp attempts, sort `{attemptedAt:-1,_id:-1}`, tổng success tính trên **toàn bộ filter**, không riêng trang. Chi tiết lịch có customerPhone cho Manager, danh sách không trả nếu không cần. Mount router ở `app.js` với booking repository.

```js
const start = new Date(`${date}T00:00:00+07:00`);
const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
const match = { "appointments.startTime": { $gte: start, $lt: end } };
router.get("/appointments", requireRole("general_manager"), handle(async (req, res) => {
  res.json(await service.appointments(req.auth, req.query));
}));
```
- [ ] **Step 4: Chạy xanh.** Lệnh Step 2, `npm test`, `npm run test:booking:integration`, `npm run test:work-shifts:integration` trong `services/core-api` (integration khi Mongo sẵn sàng). Xem kết quả 401/403 và không lộ phone trong history.
- [ ] **Step 5: Commit.** `git add services/core-api/src services/core-api/test && git commit -m "feat(core): add manager read APIs"`.

### Task 4: Hợp đồng API và tài liệu Core

**Files:** Modify `src/docs/openapi.json`, `test/docs.test.js`, `docs/03-thiet-ke-he-thong.md`, `docs/08-admin-web.md` (phần hợp đồng backend).

**Interfaces:** Giữ path/request/response đúng Tasks 1–3, bao gồm 409 lịch cũ, 403 role sai, 401 staff bị khóa.

- [ ] **Step 1: Viết test thất bại.** Trong `test/docs.test.js`, assert OpenAPI có đủ 4 GET `/manager/*`, `POST /appointments/{id}/pay` có body `provider/outcome/requestId`, schema Appointment có `bookedPrice`, Payment Attempt có `amount/status/branchId`; ví dụ không gọi tiền thật.

```js
for (const path of ["/manager/overview", "/manager/appointments", "/manager/appointments/{id}", "/manager/payments"]) {
  assert.ok(spec.paths[path]?.get, `missing GET ${path}`);
}
assert.ok(spec.paths["/appointments/{id}/pay"]?.post?.requestBody);
```
- [ ] **Step 2: Chạy test đỏ.** `cd services/core-api; npm run test:docs` → FAIL ở path/schema mới.
- [ ] **Step 3: Sửa tối thiểu.** Cập nhật JSON OpenAPI theo response thực tế từ Tasks 1–3; sửa tài liệu hệ thống ghi Manager dùng mobile, Admin Web chỉ System Admin, mô tả lịch cũ thiếu giá và tiền mô phỏng. Đảm bảo JSON parse được bằng `node -e "JSON.parse(require('fs').readFileSync('src/docs/openapi.json'))"`.

```json
{"/manager/payments":{"get":{"summary":"Mock payment attempts by branch","security":[{"bearerAuth":[]}],"responses":{"200":{"description":"Attempts and simulated total"},"403":{"description":"General Manager required"}}}}}
```
- [ ] **Step 4: Chạy xanh.** `npm test` trong `services/core-api`, parse OpenAPI như trên; kiểm tra `rg -n "Manager.*web|manager.*web" docs/03-thiet-ke-he-thong.md docs/08-admin-web.md` không còn phát biểu hiện trạng sai.
- [ ] **Step 5: Commit.** `git add services/core-api/src/docs services/core-api/test/docs.test.js docs/03-thiet-ke-he-thong.md docs/08-admin-web.md && git commit -m "docs: document manager core and mock payments"`.

## Acceptance Gate

Chạy các lệnh xanh của từng task, xem lại diff, kiểm tra `git status --short`. Khi Mongo không có, báo chính xác integration nào chưa chạy; không gọi hoàn tất phần thanh toán nguyên tử nếu chưa kiểm tra cạnh tranh thật. Sau đó thực hiện [plan mobile](2026-10-20-manager-mobile.md).
