# MMA301 — 30Shine Booking

**Báo cáo & tài liệu phát triển** cho đề tài ứng dụng đặt lịch cắt tóc (tham chiếu 30Shine).

| | |
|--|--|
| **GitHub** | https://github.com/xukki241/MMA301-30Shine-Booking |
| **Notion** | https://app.notion.com/p/3d41a3267e3e8167aba3ef159c164a65 |
| **Môn** | Lập trình ứng dụng di động bằng React Native |

## Đọc tài liệu bắt đầu từ đây

👉 **[docs/00-muc-luc-bao-cao.md](./docs/00-muc-luc-bao-cao.md)** — mục lục báo cáo (Chương 1–6 + phụ lục).

## Phạm vi MVP (một dòng)

Branch → Service → Stylist → Slot → `booked` → Stylist `completed` → Customer pay mô phỏng → `paid`  

**Thiết kế mục tiêu:** General Manager xếp Work Shift và quản lý mọi chi nhánh; System Admin chỉ quản lý tài khoản/quyền, health và audit log. Xem [phạm vi](./SCOPE.md), [flow và màn hình](./docs/03-thiet-ke-he-thong.md), [ADR 0006](./docs/adr/0006-separate-system-admin-and-general-manager.md).

**Code SHINE-26:** `system_admin` quản lý tài khoản nhân sự, health và audit log; `general_manager` nhận quyền catalog/Work Shift trên mọi chi nhánh. Lịch sử Payment Attempt theo chi nhánh và màn Manager theo dõi lịch vẫn ở backlog. [Hướng dẫn admin web](./docs/08-admin-web.md) và OpenAPI mô tả chức năng đang chạy.

**Flow Customer đã cập nhật:** chỉ nhập tên + số điện thoại, không cần mật khẩu. OTP khôi phục lịch là mô phỏng trong log Auth Service, không gửi SMS. Xem [ADR 0007](./docs/adr/0007-customer-name-phone-guest-session.md) và [hướng dẫn mobile](./apps/mobile/README.md).

## Cấu trúc mã nguồn

```text
apps/mobile              # Customer + Stylist (Expo)
apps/admin-web           # System Admin + General Manager
services/auth-service    # :4101
services/core-api        # :4102
docs/                    # Báo cáo chuẩn
CONTEXT.md
```

## Chạy nhanh

```bash
cd services/auth-service && npm i && npm run dev
cd services/core-api && npm i && npm run dev
```

Chi tiết: [docs/06-huong-dan-phat-trien.md](./docs/06-huong-dan-phat-trien.md).

System Admin setup và Work Shift/API contract hiện tại: [docs/08-admin-web.md](./docs/08-admin-web.md).

## Admin Web và Work Shift hiện tại

Admin Web chạy ở `apps/admin-web` (Vite, mặc định `http://localhost:5173`); cấu hình `VITE_AUTH_API_URL` và `VITE_CORE_API_URL` trong `apps/admin-web/.env`. Cần chạy Auth Service (`:4101`) và Core API (`:4102`) cùng MongoDB trước.

General Manager quản lý Branch/Service/Stylist và Work Shift ngày cụ thể; System Admin quản lý tài khoản nhân sự và theo dõi health/audit. Core API sinh slot theo duration dịch vụ tại `GET /time-slots`; mobile dùng catalog/slot thật và Guest Session Customer trước khi đặt lịch. Chi tiết ở [apps/admin-web/README.md](./apps/admin-web/README.md) và [services/core-api/README.md](./services/core-api/README.md).

## Nhóm

Nguyễn Xuân Kiên · Nguyễn Anh Tú · Nguyễn Quốc Hưng · Nguyễn Quang Lộc · Ngô Quang Huy  

Phân công: [docs/05-phan-cong-nhom.md](./docs/05-phan-cong-nhom.md).
