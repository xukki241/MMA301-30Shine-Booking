# Phạm vi MVP — 30Shine Booking (Phụ lục báo cáo)

Tóm tắt nhanh; chi tiết xem `docs/01-gioi-thieu.md` và `docs/02-phan-tich-yeu-cau.md`.

## Bắt buộc
- Roles: Customer, Stylist, Shop Admin
- Customer: Branch → Service → Stylist → Slot → Appointment (`booked`)
- Shop Admin sở hữu Work Shift
- Stylist: lịch ngày + complete
- Customer thanh toán MoMo/VNPay mô phỏng sau `completed` → `paid`
- Hủy khi `booked`
- Auth Service tách + Core API; web admin Shop Admin
- Mobile RN Android

## Điểm cao / stretch
- Chat, review/tip, thống kê nâng cao, push, map
