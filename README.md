# MMA301 — 30Shine Booking

Ứng dụng đặt lịch cắt tóc bằng React Native (Expo), kèm Admin Web và hai API. Dự án được thực hiện cho môn Lập trình ứng dụng di động.

| | |
|--|--|
| **GitHub** | https://github.com/xukki241/MMA301-30Shine-Booking |
| **Notion** | https://app.notion.com/p/3d41a3267e3e8167aba3ef159c164a65 |
| **Môn** | Lập trình ứng dụng di động bằng React Native |

## Chức năng hiện có

- **Customer:** xem salon và dịch vụ không cần đăng nhập; đăng ký hoặc đăng nhập bằng số điện thoại và mật khẩu 6 số; quản lý hồ sơ, đặt và hủy lịch, xem lịch hẹn. OTP đăng ký/đặt lại mật khẩu là bản demo được ghi ở console Auth Service, không gửi SMS.
- **Stylist:** xem lịch được giao, ghi nhận khách đến, hoàn thành dịch vụ hoặc xác nhận khách không đến theo quy tắc thời gian.
- **General Manager:** dùng app Expo để quản lý chi nhánh, dịch vụ, thợ và ca làm; xem tổng quan, lịch đặt và thanh toán.
- **System Admin:** dùng Admin Web để quản lý tài khoản nhân sự, xem health và audit log.
- **Thanh toán sau dịch vụ:** Customer chọn tiền mặt hoặc chuyển khoản QR. General Manager xác nhận tiền mặt; Core API đối chiếu chuyển khoản qua SePay khi được cấu hình. Lịch chỉ chuyển sang `paid` sau khi backend xác nhận đã nhận đủ tiền. Việc đối chiếu giao dịch thật cần API token SePay và kiểm tra trên môi trường thực tế.

Luồng đặt lịch trên mobile: **Salon → Stylist/ngày/giờ → Dịch vụ → xác nhận**. Giờ trống được tính từ ca làm, thời lượng dịch vụ và các lịch đã đặt. Trạng thái lịch chính: `booked` → `checked_in` → `completed` → `paid`; lịch cũng có thể chuyển sang `cancelled` hoặc `no_show` theo quyền và điều kiện tương ứng.

## Cấu trúc dự án

| Thư mục | Vai trò |
|---|---|
| [`apps/mobile`](./apps/mobile/README.md) | Expo cho Customer, Stylist và General Manager |
| [`apps/admin-web`](./apps/admin-web/README.md) | React/Vite cho System Admin |
| [`services/auth-service`](./services/auth-service/README.md) | Tài khoản, xác thực, health và audit; cổng 4101 |
| [`services/core-api`](./services/core-api/README.md) | Catalog, ca làm, đặt lịch và thanh toán; cổng 4102 |
| [`docs`](./docs/00-muc-luc-bao-cao.md) | Báo cáo, thiết kế và các quyết định kiến trúc |

## Chạy local

Cần Node.js 24 LTS, npm, MongoDB và Android Emulator hoặc thiết bị để chạy mobile. Mỗi ứng dụng có `package-lock.json` riêng; chạy các lệnh dưới đây trong các terminal riêng. Dùng PowerShell từ thư mục gốc của repo:

```powershell
cd services/auth-service
npm ci
Copy-Item .env.example .env
# Điền JWT_SECRET (ít nhất 32 byte), rồi chạy:
npm run dev
```

```powershell
cd services/core-api
npm ci
Copy-Item .env.example .env
# Dùng cùng JWT_SECRET với Auth Service
npm run dev
```

Hai service cần kết nối MongoDB trước khi mở cổng. File `.env.example` chứa URI database và địa chỉ gọi chéo mặc định (`CORE_API_URL` ở Auth, `AUTH_SERVICE_URL` ở Core). Không commit file `.env` hoặc token SePay.

Với database mới, đặt `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong `services/auth-service/.env`, chạy `npm run bootstrap:admin` tại thư mục Auth Service một lần, rồi xóa hai biến này. System Admin đăng nhập Admin Web để tạo tài khoản General Manager đầu tiên.

```powershell
cd apps/mobile
npm ci
Copy-Item .env.example .env
npm run android
```

Mobile dùng `EXPO_PUBLIC_AUTH_API_URL` và `EXPO_PUBLIC_CORE_API_URL`. Giá trị mặc định `10.0.2.2` dành cho Android Emulator; dùng `localhost` khi chạy web hoặc IP LAN của máy chạy API khi dùng điện thoại thật.

```powershell
cd apps/admin-web
npm ci
Copy-Item .env.example .env
npm run dev
```

Admin Web mặc định ở `http://localhost:5173` và gọi Auth Service qua `VITE_AUTH_API_URL`. Tài liệu API của Core có tại `http://localhost:4102/docs` khi service chạy; có thể chạy `npm run docs` trong `services/core-api` để xem tài liệu độc lập với MongoDB.

## Kiểm tra

```powershell
npm run test:api
npm test --prefix apps/mobile
npm run typecheck --prefix apps/mobile
npm test --prefix apps/admin-web
npm run build --prefix apps/admin-web
```

Các bài integration cần MongoDB test riêng; xem README của từng service. Hướng dẫn chi tiết nằm trong README của từng ứng dụng và [mục lục tài liệu](./docs/00-muc-luc-bao-cao.md). Phạm vi dự kiến và quyết định thanh toán được ghi trong [SCOPE.md](./SCOPE.md) và [ADR 0011](./docs/adr/0011-sepay-bank-transfer-after-service.md); một số tài liệu cũ vẫn mô tả Guest Session hoặc thanh toán mô phỏng.

## Nhóm

Nguyễn Xuân Kiên · Nguyễn Anh Tú · Nguyễn Quốc Hưng · Nguyễn Quang Lộc · Ngô Quang Huy. Xem [phân công nhóm](./docs/05-phan-cong-nhom.md).
