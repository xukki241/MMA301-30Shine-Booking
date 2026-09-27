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
