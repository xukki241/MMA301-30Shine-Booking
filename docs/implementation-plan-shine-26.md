# SHINE-26 — Role Based Access and System Administration

## Mục tiêu

Triển khai phần 1 (ranh giới bốn role) và phần 3 (System Admin) của thiết kế tại [ADR 0006](./adr/0006-separate-system-admin-and-general-manager.md), [ma trận quyền](./02-phan-tich-yeu-cau.md) và [danh sách màn hình](./03-thiet-ke-he-thong.md). Customer tiếp tục dùng Guest Session theo [ADR 0007](./adr/0007-customer-name-phone-guest-session.md). Phần vận hành của Manager chỉ đổi quyền từ `shop_admin` sang `general_manager`; màn hình vận hành mới thuộc hạng mục tiếp theo.

## Hợp đồng và thứ tự triển khai

1. **Auth và chuyển đổi:** Staff User có một role `stylist`, `system_admin` hoặc `general_manager`, trạng thái active/locked và `authVersion`. Chuyển dữ liệu `shop_admin` cũ sang `system_admin` bằng lệnh idempotent; có lệnh bootstrap System Admin cho database mới. Ngừng đăng ký role công khai; Customer dùng Guest Session.
2. **Phiên và quyền:** Login staff từ chối User khóa. JWT staff mang role và `authVersion`. Auth cung cấp kiểm tra phiên hiện hành; Core kiểm tra quyền staff với trạng thái hiện tại trước khi xử lý request, nên khóa/đổi role có hiệu lực ngay. `system_admin` không có endpoint vận hành; `general_manager` nhận quyền catalog và Work Shift của `shop_admin` cũ. Customer/Stylist chỉ dùng endpoint của mình.
3. **Tài khoản:** API System Admin liệt kê, xem, tạo, sửa email/mật khẩu, đổi role, khóa mềm và khôi phục User. Không trả `passwordHash`. Không cho khóa hoặc đổi role System Admin cuối cùng. Chặn khóa/đổi role Stylist còn ca tương lai hoặc lịch chưa xử lý bằng kiểm tra từ Core.
4. **Health:** Endpoint chỉ System Admin xem trạng thái Auth Service, Core API và hai MongoDB cùng thời điểm kiểm tra; lỗi phụ thuộc hiển thị rõ thành phần lỗi, không trả bí mật cấu hình.
5. **Audit:** Lưu bền vững metadata cho đăng nhập thất bại, thao tác User/role, catalog, ca, chuyển trạng thái lịch và thanh toán. Chỉ System Admin liệt kê/lọc; không lưu mật khẩu, token, OTP hoặc thông tin thanh toán nhạy cảm. Ghi cả thành công và thất bại quan trọng.
6. **Admin Web:** Sau login, `system_admin` chỉ thấy Tài khoản, Health, Audit Log. `general_manager` chỉ thấy menu vận hành hiện có. Mọi API cũng thực thi ranh giới trên server.
7. **Tài liệu và xác minh:** Cập nhật OpenAPI/README theo code đã chạy. Test quyền chéo, đổi role/khóa vô hiệu phiên, Admin cuối cùng, Stylist còn ca/lịch, Guest Customer không bị rò dữ liệu, health thiếu phụ thuộc, audit lọc và loại bí mật; chạy test Auth/Core và build Admin Web.

## Quyết định đã chốt

Customer Guest Session không phải Staff User. System Admin chỉ quản lý tài khoản nhân sự; Customer Guest không có trong danh sách User quản trị và không có thao tác khóa/đổi role từ màn này. Quy tắc “khóa tài khoản Customer” cũ trong ADR 0006 đã được thay bằng quyết định này.

## Giới hạn hiện tại

Audit được ghi vào MongoDB trước khi trả kết quả HTTP cho thao tác Core và thao tác quản trị Auth. Nếu riêng lần ghi audit thất bại sau khi nghiệp vụ đã ghi thành công, server báo lỗi vào log nhưng vẫn trả kết quả nghiệp vụ thật; chưa có transaction/outbox bảo đảm tính nguyên tử giữa dữ liệu nghiệp vụ và audit trên MongoDB standalone. Cần cơ chế outbox hoặc transaction trên replica set trước khi dùng audit như bằng chứng tuân thủ nghiêm ngặt.
