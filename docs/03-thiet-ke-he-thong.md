# Chương 3. Thiết kế hệ thống

## 3.1. Kiến trúc

| Thành phần | Vai trò |
|------------|---------|
| `apps/mobile` | Customer + Stylist (Expo RN) |
| `apps/admin-web` | Shop Admin — CRUD danh mục và Work Shift |
| `services/auth-service` | Đăng ký / đăng nhập / JWT |
| `services/core-api` | Branch, Service, Stylist, Work Shift, Appointment, Payment mô phỏng |
| Database | MongoDB hoặc MySQL (chốt một loại) |

```text
[Mobile] -----> Auth Service
[Mobile] -----> Core API -----> DB
[Admin Web] --> Auth Service
[Admin Web] --> Core API -----> DB
```

## 3.2. Mô hình miền

Thuật ngữ chuẩn: `CONTEXT.md`.

```text
Branch
  ├─ Service (giá, duration)
  ├─ Stylist (làm việc tại branch)
  └─ Work Shift (Shop Admin xếp)
        └─ Time Slot (suy ra)
              └─ Appointment (Customer)
                    └─ Payment (sau completed)
```

## 3.3. Thực thể chính

| Thực thể | Thuộc tính tối thiểu |
|----------|----------------------|
| User | id, identifier, passwordHash, role |
| Branch | id, name, address, … |
| Service | id, branchId?, name, price, durationMinutes |
| StylistProfile | userId, branchId, displayName |
| WorkShift | id, stylistId, branchId, startAt, endAt |
| Appointment | id, customerId, branchId, serviceId, stylistId, startAt, endAt, status |
| Payment | id, appointmentId, provider (`momo`\|`vnpay_mock`), amount, status, paidAt |

## 3.4. Quy tắc tính slot và chống trùng

1. Lấy các Work Shift của Stylist trong ngày tại Branch.  
2. Cắt thành các ô theo bước (ví dụ 30 phút) hoặc theo `durationMinutes` của Service.  
3. Loại bỏ khoảng đã bị Appointment `booked|completed|paid` chiếm.  
4. Khi tạo Appointment: transaction/kiểm tra không giao nhau với lịch hiện có cùng stylistId.

## 3.5. Luồng nghiệp vụ theo vai trò

### Customer

1. Đăng nhập → chọn Branch → Service → Stylist → Slot → xác nhận (`booked`).  
2. Đến giờ, được phục vụ.  
3. Sau `completed`, mở lịch → chọn MoMo/VNPay mô phỏng → `paid`.  
4. Có thể hủy khi còn `booked`.  

### Stylist

1. Đăng nhập → xem lịch hôm nay.  
2. Bấm hoàn thành từng Appointment.  

### Shop Admin

1. Quản lý Branch, Service, Stylist.  
2. Xếp Work Shift (nguồn sự thật của giờ trống).  
3. Theo dõi lịch / (tuỳ chọn) thống kê nhẹ.  

## 3.6. Định hướng màn hình

| Vai trò | Màn gợi ý | Phụ trách |
|---------|-----------|-----------|
| Customer | Login, chọn Branch/Service/Stylist/Slot, Lịch của tôi, Thanh toán | Lộc (wizard + lịch), Hưng (pay) |
| Stylist | Login, Lịch hôm nay | Huy |
| Shop Admin | CRUD Branch/Service/Stylist/Shift | Huy (admin-web) |
| Hạ tầng | Auth, chống trùng, status machine | Kiên |
| API book/slot/complete | — | Tú |
