# Chương 4. Công nghệ và quyết định kỹ thuật

## 4.1. Stack

| Lớp | Công nghệ |
|-----|-----------|
| Mobile | React Native + Expo |
| Admin | Web đơn giản (React/Vite khuyến nghị) |
| Backend | Node.js + Express |
| Auth | JWT, Auth Service riêng |
| Nghiệp vụ | Core API |
| Thanh toán | MoMo/VNPay **mô phỏng** (không kết nối cổng thật ở MVP) |
| DB | MongoDB (code hiện tại và thiết kế mục tiêu) |

## 4.2. ADR

| Mã | Quyết định |
|----|------------|
| 0001 | Dự án độc lập với LMS; quyết định MVP ban đầu có 3 role (lịch sử) |
| 0002 | Thứ tự book: Branch → Service → Stylist; có chọn thợ; payment trong scope; chỉ Auth tách service |
| 0003 | Thanh toán **sau** hoàn thành dịch vụ |
| 0004 | Customer là người bấm thanh toán mô phỏng trên app |
| 0005 | Role `shop_admin` sở hữu Work Shift trong MVP ban đầu; Stylist không tự khai báo ca |
| 0006 | Đã triển khai ranh giới 4 role và System Admin trong SHINE-26; Manager theo dõi lịch/thanh toán theo Branch còn trong backlog |
| 0007 | Customer vào app bằng tên + số điện thoại, phiên thiết bị; OTP demo chỉ để khôi phục lịch trên thiết bị khác |

Chi tiết trong `docs/adr/`.

## 4.3. Định hướng sản phẩm

- Đề tài tham chiếu trải nghiệm đặt lịch của chuỗi salon; flow của nhóm được chốt riêng là Branch → Service → Stylist → Slot theo ADR 0002.
- Mô hình xếp ca tập trung: General Manager hiện sở hữu Work Shift; Stylist chỉ xem lịch được giao.
