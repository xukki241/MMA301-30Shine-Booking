# ADR 0006 — Tách System Admin và General Manager

**Trạng thái:** Ranh giới role và System Admin được triển khai trong SHINE-26; phần Manager theo dõi lịch/thanh toán còn là thiết kế mục tiêu.

## Bối cảnh

MVP ban đầu có `customer`, `stylist`, `shop_admin`; đăng ký công khai từng cho phép chọn role. Khi mở rộng thành hệ thống chuỗi, quản trị tài khoản/hạ tầng cần tách khỏi dữ liệu kinh doanh và vận hành chi nhánh. SHINE-26 đã đóng đăng ký công khai và chuyển role nhân sự cũ.

## Quyết định

1. Mỗi tài khoản nhân sự có đúng một role: `stylist`, `system_admin` hoặc `general_manager`. Customer sử dụng Guest Session mang role `customer`, không nằm trong danh sách tài khoản nhân sự.
2. `system_admin` chỉ tạo/xem/sửa/khóa mềm/khôi phục tài khoản nhân sự, đổi role, xem health Auth/Core/database và audit log metadata. Role này không xem hoặc sửa Branch, Service, Stylist Profile, Work Shift, Appointment hay Payment Attempt.
3. `general_manager` vận hành **mọi Branch**: quản lý Branch/Service/Stylist Profile/Work Shift, lọc lịch và xem lịch sử thanh toán mô phỏng theo Branch. Role này không quản lý User/role hoặc xem health/audit log.
4. Customer vào app bằng Guest Session; endpoint đăng ký User công khai đã đóng. Nhân sự do System Admin tạo. Tài khoản `shop_admin` cũ chuyển thành `system_admin`, rồi Admin tạo General Manager đầu tiên. Database mới dùng lệnh bootstrap System Admin một lần.
5. “Xóa” User nhân sự trong giao diện là khóa mềm có thể khôi phục; phiên đăng nhập hiện có bị vô hiệu khi khóa hoặc đổi role. Customer Guest không nằm trong danh sách User quản trị. Chặn khóa/đổi role Stylist khi còn ca tương lai hoặc lịch chưa xử lý.
6. Audit log ghi actor, action, target, result và thời gian cho thao tác quan trọng, gồm đăng nhập thất bại, User/role, catalog, Work Shift, trạng thái Appointment và Payment Attempt; không lưu mật khẩu, token hoặc dữ liệu thanh toán nhạy cảm.

## Hệ quả

- Quyền vận hành Work Shift trong ADR 0005 đã chuyển từ role code cũ `shop_admin` sang `general_manager`; Stylist vẫn không tự khai báo ca.
- Luồng đặt lịch và thời điểm thanh toán trong ADR 0002–0004 giữ nguyên. Giá được chốt lúc đặt; mọi lần thanh toán mô phỏng được lưu để Manager tra cứu, chỉ lần thành công đưa lịch sang `paid`.
- Auth, Core API và Admin Web đã tách role; Manager hiện có màn catalog/Work Shift, còn tổng quan lịch và Payment Attempt theo Branch thuộc phần vận hành triển khai sau. `08-admin-web.md` và OpenAPI mô tả code hiện tại.
