# Chương 6. Hướng dẫn phát triển và triển khai — code hiện tại

> Các lệnh và quyền API ở chương này áp dụng cho code đang chạy với `shop_admin`. Thiết kế mục tiêu bốn role ở [Chương 2](./02-phan-tich-yeu-cau.md) chưa được triển khai.

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

## 6.3. API khung

### Auth (`:4101`)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Health |
| POST | `/auth/register` | Tạo tài khoản theo role |
| POST | `/auth/login` | Đăng nhập, trả JWT |
| POST | `/auth/customer/start` | Khách nhập tên + số điện thoại, nhận Guest Session |
| POST | `/auth/customer/resume` | Tiếp tục Guest Session trên cùng thiết bị |
| POST | `/auth/customer/recovery/request` | Tạo OTP demo, ghi mã ở console Auth Service |
| POST | `/auth/customer/recovery/verify` | Khôi phục lịch guest cũ cùng số bằng OTP demo |

### Core (`:4102`)

| Nhóm | Path gợi ý | Mô tả |
|------|------------|--------|
| Health | `GET /health` | |
| Catalog | `/branches`, `/services`, `/stylists` | CRUD / list |
| Shifts | `/work-shifts` | CRUD ca; chỉ Shop Admin ghi |
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
