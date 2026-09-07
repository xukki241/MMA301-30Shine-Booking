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
| DB | MongoDB hoặc MySQL |

## 4.2. ADR

| Mã | Quyết định |
|----|------------|
| 0001 | Dự án độc lập với LMS; làm song song task; MVP mỏng hơn LMS về độ rộng module nhưng đủ thanh toán & 3 role |
| 0002 | Thứ tự book: Branch → Service → Stylist; có chọn thợ; payment trong scope; chỉ Auth tách service |
| 0003 | Thanh toán **sau** hoàn thành dịch vụ |
| 0004 | Customer là người bấm thanh toán mô phỏng trên app |
| 0005 | Shop Admin sở hữu Work Shift; Stylist không tự khai báo ca |

Chi tiết trong `docs/adr/`.

## 4.3. Tham chiếu thực tế đã khảo sát

- App 30Shine phía khách: chọn salon → stylist → giờ → dịch vụ (nhóm điều chỉnh thứ tự Service trước Stylist cho đồ án, đã ghi trong ADR).  
- Fresha/Booksy: quản lý xếp ca tập trung; staff chủ yếu xem lịch — phù hợp chọn Admin sở hữu Work Shift.  
