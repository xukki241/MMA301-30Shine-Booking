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
(Shop Admin xếp Work Shift; Auth tách; Core API một process.)

## Cấu trúc mã nguồn

```text
apps/mobile              # Customer + Stylist (Expo)
apps/admin-web           # Shop Admin
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

## Nhóm

Nguyễn Xuân Kiên · Nguyễn Anh Tú · Nguyễn Quốc Hưng · Nguyễn Quang Lộc · Ngô Quang Huy  

Phân công: [docs/05-phan-cong-nhom.md](./docs/05-phan-cong-nhom.md).
