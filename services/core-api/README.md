# Core API — booking, shifts, appointments, payment mock

## SHINE-02: xác minh JWT

Node.js 24 LTS, CommonJS + Express. Từ root repo:

```powershell
cd services/core-api
npm ci
Copy-Item .env.example .env
```

Điền JWT_SECRET **giống hệt Auth Service** (ít nhất 32 byte); PORT mặc định 4102.
Thiếu secret hoặc secret quá ngắn: server fail trước khi listen, không có secret dự phòng.

```powershell
npm run dev
# hoặc npm start
npm test
```

GET /health vẫn public. GET /auth/me cần JWT từ POST /auth/login của Auth Service:

```bash
curl -i http://localhost:4102/auth/me -H "Authorization: Bearer <accessToken>"
```

Trên Windows PowerShell dùng curl.exe thay curl.
200 trả:

```json
{"user":{"userId":"507f1f77bcf86cd799439011","role":"customer"}}
```

Middleware `src/middleware/auth.js` gán `req.auth = { userId, role }` sau khi verify.
Chỉ chấp nhận HS256, chữ ký đúng, token còn hạn, sub là Mongo ObjectId, role thuộc
customer/stylist/shop_admin và exp tồn tại. Thiếu/sai/hết hạn token trả 401 với
WWW-Authenticate: Bearer. Đây là xác minh danh tính; chưa thêm các rule quyền booking.

Test dùng node:test + HTTP local; bao phủ cả ba role, thiếu token, chữ ký sai,
hết hạn, nbf trong tương lai, sai thuật toán/role/claims và public health.

## SHINE-03: booking và state machine

### Phạm vi và dependencies

Checkout hiện chưa có SHINE-06 (Work Shift/Time Slot) hoặc SHINE-07.
API dưới đây chỉ là booking tối thiểu để gắn logic anti double-book và status machine.
Chưa kiểm tra stylist có tồn tại/được gán chi nhánh, dịch vụ, duration hoặc nằm trong ca;
các kiểm tra đó chờ SHINE-06/07 và phải gọi cùng booking service/repository này.
Pay là mock chuyển trạng thái, không thu tiền và không tạo payment gateway/refund.

Core dùng Mongoose cùng major version với Auth Service.
Đặt MONGODB_URI trỏ đến database **Core** (ví dụ shine_core) trong .env.
Có URI: server đợi kết nối/index trước khi listen; Mongo lỗi thì startup fail.
Không có URI: /health và /auth/me vẫn chạy, /appointments trả 503 sau bước JWT.
Không có repository in-memory cho server.

### Model và chống double-book atomic

Collection `stylist_calendars`: mỗi document có `_id = stylistId`.
Mỗi phần tử `appointments` có `_id, customerId, stylistId, startTime, endTime, status,
createdAt, updatedAt`. Trạng thái chỉ gồm booked/completed/paid/cancelled.
Khoảng giờ phải có startTime < endTime.

1. Bootstrap calendar rỗng bằng upsert trên `_id` (unique index có sẵn).
   Nếu hai request cùng bootstrap, duplicate-key được xử lý và cả hai tiếp tục bước 2.
2. Một `findOneAndUpdate` duy nhất vừa kiểm tra không có appointment active overlap,
   vừa `$push` appointment booked vào document đó.
   Không upsert ở bước kiểm tra overlap.
3. Overlap: `newStart < existingEnd && newEnd > existingStart`.
   booked/completed/paid chiếm giờ; cancelled giải phóng giờ.
4. Với hai request cùng slot, sau khi một update thành công, filter của request kia
   không còn khớp: trả 409. Không dùng mutex chỉ nằm trong một Node process.

Cơ chế dựa trên [MongoDB single-document atomicity](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/),
hoạt động với standalone Mongo, không đòi replica-set transaction.
**Chỉ đánh dấu acceptance concurrency sau khi integration test trên Mongo thật pass.**

Giới hạn MVP: tất cả lịch của một stylist nằm trong một document, bị giới hạn 16 MiB.
Không tự xóa lịch sử để giảm kích thước. Khi dữ liệu tăng cần thiết kế lưu trữ/phân vùng
có bảo toàn tính atomic riêng; không tách mỗi appointment thành document rồi giữ nguyên
logic read-before-insert. Endpoint không hỗ trợ sửa stylist, thời gian hoặc generic status.

### Endpoint và quyền

Mọi endpoint yêu cầu header `Authorization: Bearer <accessToken>`, dùng middleware SHINE-02.

| Method | Endpoint | Input/quyền | Kết quả |
|---|---|---|---|
| POST | /appointments | customer; stylistId, startTime, endTime | 201 + appointment booked; overlap 409 |
| POST | /appointments/:id/complete | stylist được gán; body rỗng | 200 + completed |
| POST | /appointments/:id/cancel | customer sở hữu; body rỗng | 200 + cancelled |
| POST | /appointments/:id/pay | customer sở hữu; body rỗng | 200 + paid mock |

Book không nhận customerId/status từ client; lấy customerId từ JWT.
Datetime dùng ISO 8601 có timezone, ví dụ 2030-10-20T10:00:00Z hoặc 2030-10-20T17:00:00+07:00.
ID là Mongo ObjectId dạng 24 ký tự hex. Field thừa bị từ chối.
Sai input/id/state: 400. Token thiếu/sai: 401. Sai role/owner: 403.
Appointment không tồn tại: 404. Mongo chưa cấu hình: 503. Lỗi nội bộ: 500 thông báo chung.

Response:

```json
{
  "appointment": {
    "id": "507f1f77bcf86cd799439012",
    "customerId": "507f1f77bcf86cd799439011",
    "stylistId": "507f1f77bcf86cd799439013",
    "startTime": "2030-10-20T10:00:00.000Z",
    "endTime": "2030-10-20T11:00:00.000Z",
    "status": "booked",
    "createdAt": "2030-10-01T00:00:00.000Z",
    "updatedAt": "2030-10-01T00:00:00.000Z"
  }
}
```

### State machine

```text
booked -- assigned stylist complete --> completed -- owner customer pay --> paid
   |
   +---- owner customer cancel ------> cancelled
```

Mọi transition khác (kể cả lặp cùng action) trả 400 với actor hợp lệ.
Mỗi update chứa cả id, owner và trạng thái nguồn trong filter (compare-and-set).
Nếu complete và cancel chạy cùng lúc, chỉ một transition được lưu; request còn lại trả 400.
Không có PATCH/PUT generic để bypass state machine.

### Chạy test

Từ services/core-api:

```powershell
npm ci
npm test
npm run test:booking
# Cấu hình TEST_MONGODB_URI trong .env trỏ Mongo test thật:
npm run test:booking:integration
```

- npm test: cả SHINE-02 auth middleware và SHINE-03.
- test:booking: unit/service/HTTP với repository double và schema validation offline.
  Pass ở đây **không chứng minh** atomic concurrency Mongo.
- test:booking:integration: hai kết nối Mongo, hai app instance, nhiều cặp POST đồng thời;
  chạy cùng contract, đọc DB kiểm tra không có lịch active overlap.
  Không có URI/Mongo thì fail, không skip để báo pass giả.
- Integration tạo collection `shine03_test_<random>`, chỉ drop collection test đó khi xong.
  Không drop database hoặc collection hiện có. Dùng Mongo test riêng.
- Repo là JavaScript, chưa có script lint/build/typecheck backend.

### Tái hiện 409 bằng HTTP

Dùng Customer token từ /auth/login, stylistId là id của Stylist.
Trong PowerShell (thay placeholder bằng token/id demo thực tế):

```powershell
$headers = @{ Authorization = "Bearer <CUSTOMER_JWT>" }
$body = @{
  stylistId = "<STYLIST_USER_ID>"
  startTime = "2030-10-20T10:00:00Z"
  endTime = "2030-10-20T11:00:00Z"
} | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri http://localhost:4102/appointments -Headers $headers -ContentType "application/json" -Body $body
# Gửi lại cùng body: lần đầu 201, lần hai 409 (PowerShell sẽ báo HTTP error).
Invoke-WebRequest -Method Post -Uri http://localhost:4102/appointments -Headers $headers -ContentType "application/json" -Body $body
```

Để tái hiện **concurrent** tự động, chạy `npm run test:booking:integration`.
Bài test “concurrent same-slot HTTP requests” dùng Promise.all gọi hai HTTP server
trên cùng Mongo collection và assert một 201 + một 409, lặp với stylist mới năm lần.

## Tài liệu test API backend (Scalar API Reference)

Trang tài liệu có sidebar theo các task backend đang có endpoint để test:
SHINE-02, SHINE-03/07, SHINE-05, SHINE-06 và SHINE-08. Các task Mobile,
Admin Web và tài liệu dự án không xuất hiện trong API Reference.

### 1. Xem tài liệu khi Core API đang chạy
Khởi động Core API:
```bash
npm run dev
# hoặc npm start
```
Truy cập qua trình duyệt:
- **Giao diện Scalar Docs:** `http://localhost:4102/docs` (hoặc cổng cấu hình trong `PORT`)
- **Raw OpenAPI JSON Spec:** `http://localhost:4102/openapi.json`

### 2. Xem tài liệu độc lập (Không cần MongoDB)
Nếu chưa bật MongoDB hoặc chỉ muốn tra cứu tài liệu nhanh:
```bash
npm run docs
```
- Mở: `http://localhost:4001/docs`

### 3. Thử nghiệm gọi API trực tiếp (Interactive Playground)
1. Bật Auth Service ở `http://localhost:4101` và Core API ở `http://localhost:4102`.
2. Đăng nhập qua nhóm **SHINE-02** (`POST http://localhost:4101/auth/login`) để lấy `accessToken`.
3. Mở giao diện Scalar (`/docs`), bấm nút **Test Request** hoặc **Authorize**.
4. Chọn scheme **bearerAuth**, dán chuỗi JWT token vào.
5. Mở task backend cần kiểm tra trong sidebar và gửi request trực tiếp.

Hai endpoint đăng ký/đăng nhập được cấu hình gọi đúng Auth Service `:4101`.
Các endpoint còn lại gọi Core API `:4102`.
