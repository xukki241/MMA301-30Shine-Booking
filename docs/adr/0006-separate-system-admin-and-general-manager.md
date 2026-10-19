# ADR 0006 — Tách System Admin và General Manager

**Trạng thái:** Thiết kế mục tiêu; chưa triển khai vào code.

## Bối cảnh

MVP hiện tại có `customer`, `stylist`, `shop_admin`. `shop_admin` đang quản lý catalog/Work Shift trên admin web và đăng ký công khai hiện cho phép chọn role này. Khi mở rộng thành hệ thống chuỗi, quản trị tài khoản/hạ tầng cần tách khỏi dữ liệu kinh doanh và vận hành chi nhánh.

## Quyết định

1. Mỗi User có đúng một role: `customer`, `stylist`, `system_admin`, `general_manager`.
2. `system_admin` chỉ tạo/xem/sửa/khóa mềm/khôi phục User, đổi role, xem health Auth/Core/database và audit log metadata. Role này không xem hoặc sửa Branch, Service, Stylist Profile, Work Shift, Appointment hay Payment Attempt.
3. `general_manager` vận hành **mọi Branch**: quản lý Branch/Service/Stylist Profile/Work Shift, lọc lịch và xem lịch sử thanh toán mô phỏng theo Branch. Role này không quản lý User/role hoặc xem health/audit log.
4. Đăng ký công khai chỉ tạo `customer`; nhân sự do System Admin tạo. Tài khoản `shop_admin` cũ chuyển thành `system_admin`, rồi Admin tạo General Manager đầu tiên. Trình tự triển khai cần đảm bảo còn ít nhất một System Admin hoạt động.
5. “Xóa” User trong giao diện là khóa mềm có thể khôi phục; phiên đăng nhập hiện có bị vô hiệu khi khóa hoặc đổi role. Khóa Customer sau cảnh báo vẫn giữ nguyên lịch và slot; lịch `completed` chờ khách được mở khóa để thanh toán. Chặn khóa/đổi role Stylist khi còn ca tương lai hoặc lịch chưa xử lý.
6. Audit log ghi actor, action, target, result và thời gian cho thao tác quan trọng, gồm đăng nhập thất bại, User/role, catalog, Work Shift, trạng thái Appointment và Payment Attempt; không lưu mật khẩu, token hoặc dữ liệu thanh toán nhạy cảm.

## Hệ quả

- Quyền vận hành Work Shift trong ADR 0005 chuyển từ role code cũ `shop_admin` sang `general_manager` ở thiết kế mục tiêu; Stylist vẫn không tự khai báo ca.
- Luồng đặt lịch và thời điểm thanh toán trong ADR 0002–0004 giữ nguyên. Giá được chốt lúc đặt; mọi lần thanh toán mô phỏng được lưu để Manager tra cứu, chỉ lần thành công đưa lịch sang `paid`.
- Auth, Core API, admin web và tài liệu API cần triển khai đồng bộ ở giai đoạn code sau. Trong lúc đó, `08-admin-web.md` và OpenAPI tiếp tục mô tả code hiện tại.
