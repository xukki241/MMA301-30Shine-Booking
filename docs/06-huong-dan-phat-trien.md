# Chương 6. Hướng dẫn phát triển và triển khai — code hiện tại

> Các lệnh và quyền API ở chương này áp dụng cho SHINE-26: `system_admin` quản trị hệ thống, `general_manager` ghi catalog/Work Shift. Các màn Manager theo dõi lịch/thanh toán ở [Chương 2](./02-phan-tich-yeu-cau.md) vẫn là mục tiêu.

## 6.1. Môi trường

Node.js LTS, Git, Android emulator/thiết bị và MongoDB. Auth Service/Core API hiện cần kết nối MongoDB trước khi mở HTTP port.

## 6.2. Chạy dịch vụ khung

```bash
cd services/auth-service && npm i && npm run dev   # :4101
cd services/core-api && npm i && npm run dev       # :4102
cd apps/mobile && npm ci && npx expo start
cd apps/admin-web && npm ci && npm run dev         # :5173
```

Admin Web `.env`: cấu hình `VITE_AUTH_API_URL` và `VITE_CORE_API_URL` theo README riêng. Mobile `.env`: cấu hình `EXPO_PUBLIC_AUTH_API_URL` và `EXPO_PUBLIC_CORE_API_URL`; Android Emulator dùng `10.0.2.2`, thiết bị thật dùng IP LAN của máy backend.
Auth `.env` cần `CORE_API_URL`; Core `.env` cần `AUTH_SERVICE_URL`. Với database mới, đặt `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD`, chạy `npm run bootstrap:admin` trong Auth Service một lần rồi xóa hai biến khỏi `.env`.

## 6.3. API khung

### Auth (`:4101`)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Health |
| POST | `/auth/register` | Đã đóng, trả 410; Customer dùng Guest Session |
| POST | `/auth/login` | Đăng nhập, trả JWT |
| GET | `/admin/users`, `/admin/health`, `/admin/audit` | Chỉ System Admin |
| POST/PATCH | `/admin/users` và `/admin/users/:id` | Tạo/sửa tài khoản nhân sự |
| POST | `/admin/users/:id/lock`, `/restore` | Khóa mềm/khôi phục |
| POST | `/auth/customer/start` | Khách nhập tên + số điện thoại, nhận Guest Session |
| POST | `/auth/customer/resume` | Tiếp tục Guest Session trên cùng thiết bị |
| POST | `/auth/customer/recovery/request` | Tạo OTP demo, ghi mã ở console Auth Service |
| POST | `/auth/customer/recovery/verify` | Khôi phục lịch guest cũ cùng số bằng OTP demo |

### Core (`:4102`)

| Nhóm | Path gợi ý | Mô tả |
|------|------------|--------|
| Health | `GET /health` | |
| Catalog | `/branches`, `/services`, `/stylists` | CRUD / list |
| Shifts | `/work-shifts` | CRUD/xem ca; chỉ General Manager |
| Slots | `GET /time-slots` | Slot theo Work Shift và duration Service |
| Booking | `/appointments`, `/appointments/:id/complete` | Đặt / hoàn thành |
| Pay | `POST /appointments/:id/pay` | Chuyển `completed` → `paid` mô phỏng; chưa lưu Payment Attempt riêng |

## 6.4. Onboarding

1. Clone đúng repo 30Shine.  
2. Đọc `docs/00` → `01` → `05` → phần mình trong `03`.  
3. Chạy `/health`.  
4. Nhận task Notion + checklist (nếu là Huy).  

## 6.5. Nộp / bảo vệ

GitHub repo này, video demo luồng book→complete→pay, APK giai đoạn cuối, báo cáo xuất từ `docs/`.  
