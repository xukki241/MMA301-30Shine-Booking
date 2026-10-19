# Phụ lục A — Thuật ngữ miền (thiết kế mục tiêu)

> Tài liệu này thống nhất thuật ngữ cho thiết kế bốn role. Code hiện tại vẫn dùng `shop_admin`; ADR 0006 mô tả chuyển đổi.

## Vai trò

| Thuật ngữ | Ý nghĩa và ranh giới |
|---|---|
| **Customer** (`customer`) | Khách nhập tên + số điện thoại để dùng app, không có mật khẩu; đặt, hủy lịch `booked` và thanh toán mô phỏng sau `completed`. |
| **Stylist** (`stylist`) | Thợ xem lịch theo ca do Manager xếp và đánh dấu lịch của mình hoàn thành. Không tự khai báo ca. |
| **System Admin** (`system_admin`) | Quản trị tài khoản, một role cho mỗi tài khoản, health và audit log. Không xem lịch vận hành, danh mục kinh doanh hay thanh toán. |
| **General Manager** (`general_manager`) | Quản lý vận hành mọi Branch, gồm Service, hồ sơ Stylist, Work Shift, lịch đặt và lịch sử thanh toán. Không tạo tài khoản hoặc phân quyền. |
| **User** | Tài khoản đăng nhập có đúng một role và trạng thái hoạt động/khóa mềm. |

`shop_admin` là tên role **chỉ còn trong code hiện tại**. Khi triển khai thiết kế mục tiêu, tài khoản `shop_admin` cũ chuyển thành `system_admin`; System Admin tạo General Manager đầu tiên. Không dùng `shop_admin` để mô tả quyền mục tiêu.

## Nghiệp vụ đặt lịch

**Branch**: Chi nhánh nơi khách đến; Customer chọn trước Service.

**Service**: Dịch vụ tại Branch, gồm tên, giá và thời lượng. Đổi giá chỉ áp dụng cho lịch đặt mới.

**Stylist Profile**: Hồ sơ thợ tại Branch, liên kết một User có role `stylist`. Manager quản lý hồ sơ/gán chi nhánh; System Admin quản lý tài khoản.

**Work Shift**: Ca làm của Stylist tại Branch do General Manager xếp. Đây là nguồn để sinh giờ trống.

**Time Slot**: Khoảng giờ trống suy ra từ Work Shift, thời lượng Service và các Appointment đã chiếm giờ.

**Appointment**: Lịch đặt gồm Customer, Branch, Service, Stylist, thời gian và **giá chốt lúc đặt**. Trạng thái: `booked` → `completed` → `paid`, hoặc `booked` → `cancelled`.

**Guest Session**: Phiên Customer được cấp khi nhập tên + số điện thoại, gắn với bí mật lưu trên thiết bị. Số điện thoại chỉ là thông tin liên hệ; phiên chưa xác minh chỉ có quyền với lịch do phiên đó tạo.

**Recovery OTP**: Mã dùng một lần để chứng minh quyền khôi phục lịch cùng số điện thoại trên thiết bị khác. Trong đồ án mã được ghi vào console Auth Service, **không gửi SMS**, không mất phí và không xác minh quyền sở hữu số thật.

**Payment Attempt**: Một lần thanh toán MoMo/VNPay mô phỏng của Appointment `completed`, gắn Branch, số tiền theo giá đã chốt, phương thức, kết quả và thời gian. Có thể có nhiều lần thất bại; tối đa một lần thành công cho một Appointment. Không trừ tiền thật.

**Audit Log**: Bản ghi bất biến về người thực hiện, hành động, đối tượng, kết quả và thời gian của thao tác quan trọng. System Admin chỉ xem metadata cần thiết, không xem nội dung nghiệp vụ hoặc dữ liệu nhạy cảm.

**Health Status**: Trạng thái kiểm tra Auth Service, Core API và database, kèm thời điểm kiểm tra gần nhất. Không phải bộ metrics nâng cao.

## Flow chuẩn

General Manager cấu hình Branch/Service/Stylist/Work Shift → Customer chọn **Branch → Service → Stylist → Time Slot**, xác nhận Appointment `booked` → Stylist phục vụ và chuyển `completed` → Customer thanh toán mô phỏng → thành công thì `paid`; Manager theo dõi lịch và Payment Attempt theo Branch.
