# Phạm vi MVP mục tiêu — 30Shine Booking

> Đây là thiết kế mục tiêu. Code hiện tại vẫn dùng `shop_admin`; xem `docs/08-admin-web.md` để biết chức năng đã triển khai.

Chi tiết: `docs/01-gioi-thieu.md`, `docs/02-phan-tich-yeu-cau.md` và ADR 0006.

## Bắt buộc

- Mỗi tài khoản có đúng một role: `customer`, `stylist`, `system_admin` hoặc `general_manager`.
- Customer vào app bằng tên + số điện thoại, không cần email/mật khẩu; lịch trên thiết bị cũ chỉ được khôi phục sau OTP mô phỏng. System Admin tạo, phân quyền, khóa mềm và khôi phục tài khoản nhân sự trong thiết kế bốn role; xem health và audit log, không xem dữ liệu vận hành.
- General Manager vận hành **tất cả chi nhánh**: danh mục, hồ sơ thợ, Work Shift, lịch đặt và lịch sử thanh toán theo chi nhánh; không quản lý tài khoản/quyền.
- Customer: Branch → Service → Stylist → Slot → Appointment (`booked`); giá dịch vụ được chốt lúc đặt.
- Stylist: xem lịch ngày và đánh dấu `completed`.
- Customer thanh toán MoMo/VNPay **mô phỏng, không trừ tiền thật** sau `completed`; chỉ lần thành công chuyển lịch sang `paid`. Lưu cả lần thất bại và thành công để Manager tra cứu.
- Customer hủy lịch khi còn `booked`. Khóa mềm tài khoản Customer không tự hủy lịch; có thể khôi phục để tiếp tục thanh toán.
- Auth Service tách + Core API; mobile React Native Android và web quản trị theo role.

## Ngoài phạm vi

- Cổng thanh toán thật, hoàn tiền, POS, chat, review/tip, push, bản đồ và biểu đồ giám sát nâng cao.
- Stylist tự khai báo ca; Manager quản lý tài khoản; System Admin vận hành chi nhánh.
