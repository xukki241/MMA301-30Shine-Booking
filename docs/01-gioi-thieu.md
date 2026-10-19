# Chương 1. Giới thiệu đề tài

> **Thiết kế mục tiêu:** bốn role và tách quản trị hệ thống khỏi vận hành chuỗi. Code hiện tại vẫn dùng `shop_admin`; hiện trạng triển khai ở `08-admin-web.md`.

## 1.1. Tên đề tài và bối cảnh

Ứng dụng đặt lịch cắt tóc cho chuỗi cửa hàng (tham chiếu 30Shine). Khách giữ chỗ theo chi nhánh, dịch vụ, thợ và giờ trống. Chuỗi cần công cụ phân ca, theo dõi lịch và lịch sử thanh toán; người quản trị hệ thống cần quản lý tài khoản, sức khỏe dịch vụ và audit log.

## 1.2. Mục tiêu

| Mục tiêu | Mô tả |
|---|---|
| Khách hàng | Đặt/hủy lịch, xem lịch và thanh toán mô phỏng sau khi được phục vụ |
| Thợ | Xem lịch theo ca và đánh dấu hoàn thành |
| Vận hành | General Manager quản lý mọi chi nhánh, dịch vụ, thợ, ca, lịch và giao dịch mô phỏng |
| Hệ thống | System Admin quản lý tài khoản/quyền, health cơ bản và audit log, không truy cập dữ liệu vận hành |
| Kỹ thuật | React Native Android, web quản trị, Auth Service tách và Core API |

## 1.3. Đối tượng sử dụng

| Role | Trách nhiệm |
|---|---|
| `customer` | Chọn Branch → Service → Stylist → Slot; hủy khi `booked`; trả tiền mô phỏng sau `completed` |
| `stylist` | Xem lịch được giao và hoàn thành dịch vụ |
| `general_manager` | Điều hành **tất cả chi nhánh**, gồm danh mục, phân ca, lịch và lịch sử thanh toán |
| `system_admin` | CRUD tài khoản theo cơ chế khóa mềm, phân quyền, xem health và audit log |

Mỗi User chỉ có một role. Manager không quản lý tài khoản; Admin không xem hay sửa dữ liệu kinh doanh.

## 1.4. Phạm vi MVP mục tiêu

1. Customer chỉ nhập tên + số điện thoại để vào app; phiên thiết bị cho phép quản lý lịch vừa đặt. OTP demo chỉ dùng khi khôi phục lịch trên thiết bị khác. System Admin cấp tài khoản nhân sự và phân quyền ở thiết kế mục tiêu.
2. General Manager tạo Branch/Service, quản lý hồ sơ Stylist và xếp Work Shift.
3. Customer chọn Branch → Service → Stylist → Slot và xác nhận `booked`; giá được chốt tại thời điểm đặt.
4. Stylist đánh dấu `completed`; Customer thanh toán MoMo/VNPay **mô phỏng, không trừ tiền thật**. Lần thành công chuyển `paid`; lần thất bại được lưu và có thể thử lại.
5. Manager lọc lịch theo ngày, Branch, Stylist, trạng thái và xem lịch sử thanh toán theo Branch.
6. System Admin khóa mềm/khôi phục tài khoản, xem health Auth/Core/database và audit log thao tác quan trọng.

Ngoài phạm vi: cổng thanh toán thật, hoàn tiền, POS, chat, push, bản đồ, review/tip, metrics nâng cao và Stylist tự khai báo ca.

## 1.5. Kết quả nghiệm thu mục tiêu

Demo được chuỗi Manager phân ca → Customer đặt lịch không trùng slot → Stylist hoàn thành → Customer thanh toán mô phỏng → Manager tra cứu giao dịch; đồng thời Admin quản lý tài khoản, xem health và audit log mà không có quyền vận hành. Đây là tiêu chí **cho giai đoạn triển khai sau**, không phải mô tả chức năng code hiện tại.
