# Chương 2. Phân tích yêu cầu

## 2.1. Yêu cầu chức năng

### RF01 — Xác thực

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF01.1 | Đăng ký / đăng nhập, nhận JWT | Customer, Stylist, Shop Admin |
| RF01.2 | Phân quyền API theo role | Hệ thống |

### RF02 — Danh mục cửa hàng

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF02.1 | CRUD Branch | Shop Admin |
| RF02.2 | CRUD Service (tên, giá, thời lượng) | Shop Admin |
| RF02.3 | Gán Stylist vào Branch | Shop Admin |
| RF02.4 | Customer xem danh sách Branch / Service / Stylist khả dụng | Customer |

### RF03 — Ca làm việc và slot

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF03.1 | Tạo/sửa/xóa Work Shift cho Stylist tại Branch | **Chỉ Shop Admin** |
| RF03.2 | Hệ thống tính Time Slot trống từ Work Shift trừ Appointment đã giữ | Hệ thống |
| RF03.3 | Stylist **không** tự khai báo ca trong MVP | — |

### RF04 — Đặt lịch

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF04.1 | Đặt Appointment theo thứ tự Branch → Service → Stylist → Slot | Customer |
| RF04.2 | Chống đặt trùng (cùng Stylist + khoảng thời gian giao nhau) | Hệ thống |
| RF04.3 | Xem / hủy Appointment ở trạng thái `booked` | Customer |
| RF04.4 | Xem lịch trong ngày | Stylist |

### RF05 — Hoàn thành và thanh toán

| Mã | Mô tả | Actor |
|----|--------|-------|
| RF05.1 | Đánh dấu Appointment `completed` | Stylist |
| RF05.2 | Thanh toán mô phỏng MoMo/VNPay trên app sau `completed` | **Customer** |
| RF05.3 | Chuyển trạng thái `paid` khi thanh toán mô phỏng thành công | Hệ thống |

## 2.2. Yêu cầu phi chức năng

| Mã | Mô tả |
|----|--------|
| RNF01 | REST + JSON; có loading/lỗi cơ bản trên mobile |
| RNF02 | JWT; không lưu mật khẩu plain text |
| RNF03 | Chạy Android; README tái hiện được môi trường |
| RNF04 | Chỉ một Auth Service tách; Core API đơn |
| RNF05 | Có cổng thanh toán **mô phỏng** (bắt buộc theo định hướng đồ án nhóm) |

## 2.3. Máy trạng thái Appointment

```text
booked ──(Stylist hoàn thành)──► completed ──(Customer pay)──► paid
   │
   └──(Customer/Admin hủy)──► cancelled
```

Không thu tiền lúc đặt chỗ; hủy `booked` không phát sinh hoàn tiền phức tạp.

## 2.4. Ràng buộc môn học

React Native; backend trong danh mục cho phép; DB không dùng SQLite; nhóm ≤ 5; mỗi người ≥ 2 màn; commit GitHub đầy đủ; khuyến khích web admin CRUD và thanh toán mô phỏng để đạt mức điểm cao hơn.  
