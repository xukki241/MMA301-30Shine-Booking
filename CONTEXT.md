# Phụ lục A — Thuật ngữ miền (thiết kế mục tiêu)

> Tài liệu này thống nhất thuật ngữ cho bốn role. SHINE-26 đã chuyển role nhân sự từ `shop_admin`; các chức năng Manager theo dõi lịch/thanh toán còn trong thiết kế mục tiêu.

## Vai trò

| Thuật ngữ | Ý nghĩa và ranh giới |
|---|---|
| **Customer** (`customer`) | Khách có thể khám phá Home công khai; tạo/đăng nhập tài khoản bằng số điện thoại và mật khẩu 6 số theo ADR 0008. Hồ sơ có thông tin cá nhân và địa chỉ nhà tùy chọn theo ADR 0009; đặt, hủy lịch `booked` và thanh toán mô phỏng sau `completed`. |
| **Stylist** (`stylist`) | Thợ xem lịch theo ca do Manager xếp, ghi nhận khách đã đến, xác nhận khách không đến sau 15 phút và đánh dấu phục vụ hoàn thành. Không tự khai báo ca. |
| **System Admin** (`system_admin`) | Quản trị tài khoản, một role cho mỗi tài khoản, health và audit log. Không xem lịch vận hành, danh mục kinh doanh hay thanh toán. |
| **General Manager** (`general_manager`) | Quản lý vận hành mọi Branch, gồm Service, hồ sơ Stylist, Work Shift, lịch đặt và lịch sử thanh toán. Không tạo tài khoản hoặc phân quyền. |
| **User** | Tài khoản nhân sự đăng nhập có đúng một role (`stylist`, `system_admin`, `general_manager`) và trạng thái hoạt động/khóa mềm; Customer dùng Guest Session riêng. |

`shop_admin` là tên role legacy. Auth Service tự chuyển tài khoản cũ sang `system_admin` lúc khởi động; System Admin tạo General Manager đầu tiên. Database mới dùng lệnh bootstrap Admin một lần.

## Nghiệp vụ đặt lịch

**Branch**: Chi nhánh nơi khách đến; Customer chọn trước Service.

**Service**: Dịch vụ tại Branch, gồm tên, giá và thời lượng. Đổi giá chỉ áp dụng cho lịch đặt mới.

**Stylist Profile**: Hồ sơ thợ tại Branch, liên kết một User có role `stylist`. Manager quản lý hồ sơ/gán chi nhánh; System Admin quản lý tài khoản.

**Work Shift**: Ca làm của Stylist tại Branch do General Manager xếp. Đây là nguồn để sinh giờ trống.

**Time Slot**: Khoảng giờ trống suy ra từ Work Shift, thời lượng Service và các Appointment đã chiếm giờ.

**Appointment**: Lịch đặt gồm Customer, Branch, Service, Stylist, thời gian và **giá chốt lúc đặt**. Trạng thái: `booked` → `checked_in` → `completed` → `paid`, hoặc `booked` → `cancelled`/`no_show`. Quá 15 phút chưa check-in chỉ hiện nhắc kiểm tra; Stylist xác nhận `no_show` sau khi kiểm tra.

**Guest Session**: Phiên Customer được cấp khi nhập tên + số điện thoại, gắn với bí mật lưu trên thiết bị. Số điện thoại chỉ là thông tin liên hệ; phiên chưa xác minh chỉ có quyền với lịch do phiên đó tạo.

**Recovery OTP**: Mã dùng một lần để chứng minh quyền khôi phục lịch cùng số điện thoại trên thiết bị khác. Trong đồ án mã được ghi vào console Auth Service, **không gửi SMS**, không mất phí và không xác minh quyền sở hữu số thật.

**Payment Attempt**: Một lần thanh toán MoMo/VNPay mô phỏng của Appointment `completed`, gắn Branch, số tiền theo giá đã chốt, phương thức, kết quả và thời gian. Có thể có nhiều lần thất bại; tối đa một lần thành công cho một Appointment. Không trừ tiền thật.

**Audit Log**: Bản ghi bất biến về người thực hiện, hành động, đối tượng, kết quả và thời gian của thao tác quan trọng. System Admin chỉ xem metadata cần thiết, không xem nội dung nghiệp vụ hoặc dữ liệu nhạy cảm.

**Health Status**: Trạng thái kiểm tra Auth Service, Core API và database, kèm thời điểm kiểm tra gần nhất. Không phải bộ metrics nâng cao.

## Flow chuẩn

General Manager cấu hình Branch/Service/Stylist/Work Shift → Customer chọn **Branch → Service → Stylist → Time Slot**, xác nhận Appointment `booked` → Stylist ghi nhận khách đến `checked_in`, phục vụ rồi chuyển `completed` → Customer thanh toán mô phỏng → thành công thì `paid`; Manager theo dõi lịch và Payment Attempt theo Branch, khôi phục `no_show` bị ghi nhầm khi slot chưa được đặt lại.
