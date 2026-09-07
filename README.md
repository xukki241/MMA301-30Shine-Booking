# 30Shine Booking

Greenfield app đặt lịch cắt tóc — MMA301.

## Notion
- Hub: https://app.notion.com/p/3d41a3267e3e8167aba3ef159c164a65

## Stack
- `apps/mobile` — Expo (Customer + Stylist)
- `apps/admin-web` — Shop Admin (Branch/Service/Stylist/Work Shift)
- `services/auth-service` — Express Auth
- `services/core-api` — Booking + Payment mô phỏng

## Luồng MVP
Branch → Service → Stylist → Slot → `booked`
→ Stylist `completed` → Customer MoMo/VNPay mô phỏng → `paid`

Shop Admin sở hữu Work Shift. Auth tách service; Core API một process.

## Phân công
| Thành viên | Việc chính |
|---|---|
| Nguyễn Xuân Kiên | Auth, anti double-book, status machine, review |
| Nguyễn Anh Tú | Core API book + slot + complete |
| Nguyễn Quốc Hưng | Payment mô phỏng + màn pay |
| Nguyễn Quang Lộc | Mobile book wizard + my appointments |
| Ngô Quang Huy | Admin CRUD + Stylist lịch hôm nay |

## Chạy (sau khi implement)
```bash
cd services/auth-service && npm i && npm run dev
cd services/core-api && npm i && npm run dev
cd apps/mobile && npm i && npx expo start
```
