# Admin Web và phân quyền — hiện trạng SHINE-26

> Tài liệu này mô tả code hiện tại. [Chương 3](./03-thiet-ke-he-thong.md) còn chứa màn Manager theo dõi lịch và Payment Attempt theo Branch trong thiết kế mục tiêu.

## System Admin

Đăng nhập bằng email/mật khẩu tài khoản nhân sự role `system_admin`. Web chỉ hiển thị Tài khoản nhân sự, Health và Audit Log. Auth Service kiểm tra trạng thái tài khoản cùng `authVersion` trên mỗi request quản trị. System Admin tạo/sửa tài khoản nhân sự, đổi role, khóa mềm và khôi phục; không quản lý Customer Guest. Khi sửa/khóa Stylist, Auth hỏi Core về ca tương lai và lịch `booked`/`completed`; Core không trả lời thì thao tác bị từ chối. Admin cuối cùng không thể bị khóa hoặc đổi role theo kiểm tra số Admin đang hoạt động.

Health gồm Auth Service, Core API, database của từng service và `checkedAt`. Audit Log gộp metadata từ hai database; chỉ System Admin được đọc. Auth ghi login thất bại và thao tác tài khoản; Core ghi mutation catalog, Work Shift và Appointment, gồm kết quả HTTP. Không ghi body, password, token, OTP hoặc dữ liệu thanh toán nhạy cảm.

## General Manager

Role `general_manager` tiếp nhận quyền catalog/Work Shift trước đây của `shop_admin` trên mọi Branch. Web hiện có màn Danh mục và Lịch làm việc; Manager không thể gọi API quản lý tài khoản, health hoặc audit. Màn tổng quan lịch, lọc theo Branch/Stylist/trạng thái và lịch sử Payment Attempt thuộc backlog tiếp theo.

## Chuyển đổi và kiểm tra

Auth Service tự chuyển record `shop_admin` cũ sang `system_admin` lúc khởi động. Database mới dùng lệnh bootstrap một lần; xem [Admin Web README](../apps/admin-web/README.md). Endpoint `/auth/register` công khai trả 410; Customer vào bằng Guest Session tên + số điện thoại.

Chạy `npm test` trong Auth/Core, `npm run build` trong Admin Web. Core kiểm tra phiên nhân sự trực tiếp với Auth Service; Core trả 503 khi Auth không sẵn sàng thay vì chấp nhận JWT nhân sự không thể kiểm tra trạng thái.
