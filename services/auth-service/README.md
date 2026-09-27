# Auth Service — 30Shine / SHINE-02

Express + JavaScript CommonJS, npm, MongoDB/Mongoose. Một User có đúng một role:
`customer`, `stylist` hoặc `shop_admin`. Role customer/stylist dùng cùng tên với mobile.

## Cài đặt

Dùng Node.js 24 LTS. Từ root repository:

```powershell
cd services/auth-service
npm ci
Copy-Item .env.example .env
```

Sửa `.env` trước khi chạy:

| Biến | Ý nghĩa |
|---|---|
| PORT | Mặc định 4101 |
| MONGODB_URI | Kết nối database Auth của SHINE-24, ví dụ local trong env example |
| JWT_SECRET | Secret ngẫu nhiên tối thiểu 32 byte, **giống hệt Core API**; không có mặc định |
| JWT_EXPIRES_IN_SECONDS | Số giây 1–86400, mặc định 3600 (1 giờ) |
| TEST_MONGODB_URI | URI Mongo phục vụ integration test |

Tạo secret riêng trên máy bằng Node (không đưa kết quả vào Git hoặc README):

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy giá trị vào JWT_SECRET của cả hai service. File `.env` được Git ignore.
Script start/dev tự nạp `.env` bằng Node; biến môi trường đã đặt có ưu tiên cao hơn file.

## Mongo / SHINE-24

Checkout này chưa có Docker Compose, seed hoặc cấu hình Mongo từ SHINE-24.
Auth chỉ thêm Mongo client và User model; **không triển khai hạ tầng/seed SHINE-24**.
Cần có MongoDB thật từ SHINE-24 hoặc server Mongo sẵn có và điền URI của nó.
Không có fallback database trong bộ nhớ cho server.

User nằm trong collection `users`, có `_id, email, passwordHash, role, createdAt, updatedAt`.
Auth chờ kết nối Mongo và tạo unique index `email` trước khi mở HTTP port.
Email được trim/lowercase. Database có dữ liệu email trùng sẽ khiến tạo index thất bại:
cần xử lý dữ liệu đó riêng, server không tự xóa dữ liệu.
Sai/mất Mongo hoặc JWT_SECRET chưa cấu hình khiến startup fail với exit code 1.

## Chạy

```powershell
npm run dev
# hoặc
npm start
```

GET http://localhost:4101/health trả `{"ok":true,"service":"auth-service"}`.

## API và curl

Các lệnh curl sau dùng Bash/Git Bash. Mật khẩu ví dụ chỉ dùng cho demo.
Trong Windows PowerShell, có thể dùng lệnh tương đương để tránh lỗi quote JSON:

```powershell
$body = @{ email = "customer@example.test"; password = "Demo-password-2026!"; role = "customer" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4101/auth/register -ContentType "application/json" -Body $body
$loginBody = @{ email = "customer@example.test"; password = "Demo-password-2026!" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:4101/auth/login -ContentType "application/json" -Body $loginBody
```

### Register Customer

```bash
curl -i -X POST http://localhost:4101/auth/register -H "Content-Type: application/json" -d '{"email":"customer@example.test","password":"Demo-password-2026!","role":"customer"}'
```

### Register Stylist

```bash
curl -i -X POST http://localhost:4101/auth/register -H "Content-Type: application/json" -d '{"email":"stylist@example.test","password":"Demo-password-2026!","role":"stylist"}'
```

### Register Shop Admin

```bash
curl -i -X POST http://localhost:4101/auth/register -H "Content-Type: application/json" -d '{"email":"admin@example.test","password":"Demo-password-2026!","role":"shop_admin"}'
```

Response register (201):

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "customer@example.test",
    "role": "customer"
  }
}
```

Register cho phép chọn cả ba role theo phạm vi demo SHINE-02.
Đây chưa phải quy trình cấp tài khoản nhân viên/admin cho môi trường công khai.

### Login

```bash
curl -i -X POST http://localhost:4101/auth/login -H "Content-Type: application/json" -d '{"email":"customer@example.test","password":"Demo-password-2026!"}'
```

Response login (200; accessToken bên dưới là placeholder):

```json
{
  "accessToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "customer@example.test",
    "role": "customer"
  }
}
```

### Status codes và validation

| Endpoint | Input | Status |
|---|---|---|
| POST /auth/register | email, password, role | 201; 400 input/role sai; 409 email trùng |
| POST /auth/login | email, password | 200; 400 input sai; 401 sai email/password |
| Cả hai | JSON không parse được | 400 |
| Cả hai | Body quá 16 KB | 413 |
| Cả hai | Lỗi nội bộ | 500, thông báo chung |

Email là chuỗi hợp lệ cơ bản, tối đa 254 ký tự. Password đăng ký tối thiểu 8 ký tự,
tối đa 72 byte UTF-8 (giới hạn bcrypt). Login nhận password không rỗng, tối đa 72 byte.
Không trim password. Body phải là object; field thừa, role array, object thay chuỗi bị từ chối.
Unique index bảo đảm email duy nhất, kể cả race condition; Mongo error 11000 được map về 409.

## JWT / bảo mật

JWT ký HS256, payload thực tế: `{ sub: "<Mongo user id>", role, iat, exp }`.
`iat/exp` dùng giây Unix; mặc định exp - iat = 3600. Không đưa email/password/hash vào JWT.
Password hash bằng bcryptjs, cost 12; hash bị loại khỏi JSON và response chỉ chọn id/email/role.
Request body, password/hash và token không được ghi log. Lỗi nội bộ không trả stack trace.

Core API dùng cùng JWT_SECRET, chỉ chấp nhận HS256, kiểm tra chữ ký, thời hạn, user id và role.
Gọi Core với `Authorization: Bearer <accessToken>`.
Không có OAuth, refresh token, quên mật khẩu hoặc nhiều role trên một User.

## Test

Cài dependency của **cả hai service** vì test hợp đồng chạy Auth và Core qua HTTP local:

```powershell
# Từ root repo
npm ci --prefix services/auth-service
npm ci --prefix services/core-api
npm test --prefix services/auth-service
npm test --prefix services/core-api
```

`npm test` Auth dùng repository double chỉ trong test, không cần Mongo.
Bao phủ register ba role, hash/compare bcrypt, JWT thực tế được Core verify, validation,
email trùng/race, login sai, không lộ hash, cấu hình và schema.
Kết quả pass này **không chứng minh dữ liệu đã được lưu trong Mongo thật**.

Để chạy integration với Mongo thật:

```powershell
cd services/auth-service
# Cấu hình TEST_MONGODB_URI trong .env trước, rồi:
npm run test:integration
```

Integration test tạo collection riêng tên `shine02_test_<random>`, chạy HTTP register/login,
đọc trực tiếp dữ liệu Mongo, kiểm tra unique index, race condition và JWT qua Core.
Khi kết thúc chỉ xóa collection test vừa tạo; không drop database hoặc đụng collection users.
Dùng database test riêng, tài khoản có quyền tạo index/collection và drop collection test.
Không có TEST_MONGODB_URI hoặc không kết nối Mongo thì test **fail**, không skip để báo pass giả.

## Tài liệu thư viện

- [Mongoose: unique index không phải validator](https://mongoosejs.com/docs/validation)
- [bcryptjs: giới hạn password 72 byte](https://github.com/dcodeIO/bcrypt.js/)
- [jsonwebtoken: sign/verify và algorithms](https://github.com/auth0/node-jsonwebtoken)
