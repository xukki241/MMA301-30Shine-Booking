# Phạm vi MVP mục tiêu — 30Shine Booking

> Phân quyền nhân sự và System Admin thuộc SHINE-26 đã được triển khai trên nhánh này. Tổng quan lịch và lịch sử Payment Attempt theo Branch vẫn là thiết kế mục tiêu; xem `docs/08-admin-web.md` để biết màn đang chạy.

Chi tiết: `docs/01-gioi-thieu.md`, `docs/02-phan-tich-yeu-cau.md` và ADR 0006.

## Bắt buộc

- Customer có thể khám phá Home không cần đăng nhập; đặt lịch cần tài khoản số điện thoại và mật khẩu 6 chữ số theo ADR 0008. Mỗi tài khoản nhân sự có đúng một role: `stylist`, `system_admin` hoặc `general_manager`.
- Customer mới xác minh OTP mô phỏng trước khi tạo tài khoản; Customer cũ đăng nhập bằng số điện thoại và mật khẩu. System Admin tạo, phân quyền, khóa mềm và khôi phục tài khoản nhân sự; xem health và audit log, không xem dữ liệu vận hành.
- General Manager vận hành **tất cả chi nhánh**: danh mục, hồ sơ thợ, Work Shift, lịch đặt và lịch sử thanh toán theo chi nhánh; không quản lý tài khoản/quyền.
- Customer: Branch → Service → Stylist → Slot → Appointment (`booked`); giá dịch vụ được chốt lúc đặt.
- Stylist: xem lịch ngày và đánh dấu `completed`.
- Customer thanh toán MoMo/VNPay **mô phỏng, không trừ tiền thật** sau `completed`; chỉ lần thành công chuyển lịch sang `paid`. Lưu cả lần thất bại và thành công để Manager tra cứu.
- Customer hủy lịch khi còn `booked`. Lịch Guest cũ được giữ nguyên và không chuyển vào tài khoản Customer mới.
- Auth Service tách + Core API; mobile React Native Android và web quản trị theo role.

## Ngoài phạm vi

- Cổng thanh toán thật, hoàn tiền, POS, chat, review/tip, push, bản đồ và biểu đồ giám sát nâng cao.
- Stylist tự khai báo ca; Manager quản lý tài khoản; System Admin vận hành chi nhánh.
