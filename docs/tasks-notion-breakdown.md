# Các task backend có API để kiểm thử

Tài liệu này chỉ liệt kê các task backend đã có endpoint trong source code. Giao diện
Mobile, Admin Web và các task tài liệu không nằm trong danh sách API Reference.

## Danh sách task

| Task | Phạm vi API | Service |
|---|---|---|
| SHINE-02 | Đăng ký, đăng nhập, lấy và kiểm tra JWT | Auth `:4101`, Core `:4102` |
| SHINE-05 | CRUD Branch, Service, Stylist | Core `:4102` |
| SHINE-06 | Work Shift và Time Slot | Core `:4102` |
| SHINE-03/07 | Đặt lịch, chống double-book, complete, cancel | Core `:4102` |
| SHINE-08 | Chuyển appointment từ `completed` sang `paid` | Core `:4102` |

## SHINE-02 · Authentication và JWT

- `POST /auth/register` — tạo `customer`, `stylist` hoặc `shop_admin`.
- `POST /auth/login` — nhận `accessToken`.
- `GET /auth/me` — Core API xác minh JWT.

Hai endpoint đầu gọi Auth Service `http://localhost:4101`. Endpoint `/auth/me` gọi
Core API `http://localhost:4102`.

## SHINE-05 · Catalog API

- Branch: `GET, POST /branches`; `GET, PUT, DELETE /branches/:id`.
- Service: `GET, POST /branches/:branchId/services`; `GET, PUT, DELETE /services/:id`.
- Stylist: `GET, POST /branches/:branchId/stylists`; `GET, PUT, DELETE /stylists/:id`.

Các thao tác ghi yêu cầu token `shop_admin`. Các thao tác đọc hiện là public.

## SHINE-06 · Work Shift và Time Slot

- `POST /work-shifts` — Shop Admin tạo ca.
- `GET /work-shifts?stylistId=&date=` — Shop Admin xem ca.
- `DELETE /work-shifts/:id` — Shop Admin xóa ca.
- `GET /time-slots?stylistId=&date=&serviceId=` — người dùng đã đăng nhập xem slot.

Body tạo ca bắt buộc có `stylistId`, `branchId`, `date`, `startTime`, `endTime`.

## SHINE-03/07 · Booking API

- `POST /appointments` — Customer tạo appointment `booked`.
- `POST /appointments/:id/complete` — Stylist được gán chuyển sang `completed`.
- `POST /appointments/:id/cancel` — Customer sở hữu hủy appointment `booked`.

Booking hiện nhận `stylistId`, `startTime`, `endTime`. Phần kiểm tra chéo đầy đủ
Branch, Service và Work Shift của SHINE-07 chưa hoàn tất nên chưa được mô tả như một
contract đã hỗ trợ.

## SHINE-08 · Payment Mock

- `POST /appointments/:id/pay` — Customer sở hữu chuyển `completed` sang `paid`.

Endpoint hiện mô phỏng việc thanh toán bằng chuyển trạng thái. Callback MoMo/VNPay,
fail/cancel và idempotency chưa được triển khai.

## Mở giao diện kiểm thử

```powershell
npm run docs
```

Mở `http://localhost:4001/docs`. Để gửi request thật, chạy Auth Service ở `:4101`
và Core API ở `:4102`, đăng nhập trong nhóm SHINE-02 rồi dán token vào `Authorize`.
