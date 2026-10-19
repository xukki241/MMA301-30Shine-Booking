# ADR 0007 — Customer vào app bằng tên và số điện thoại

**Trạng thái:** Flow Customer đã có trong mobile/Auth/Core; phần phân quyền bốn role của ADR 0006 vẫn là thiết kế mục tiêu.

## Bối cảnh

Customer không muốn tạo email/mật khẩu trước khi dùng app. Booking hiện dựa trên `customerId` từ JWT để bảo vệ thao tác xem/hủy/thanh toán, nên tên và số điện thoại không thể tự động cấp quyền đọc mọi lịch cũ của số đó.

## Quyết định

1. Customer nhập **tên và số điện thoại Việt Nam** để bắt đầu. Auth tạo một phiên khách mới, cấp JWT role `customer` và một bí mật phiên gắn với thiết bị; app dùng bí mật đó để tiếp tục phiên khi mở lại. Customer không nhập email/mật khẩu.
2. Số điện thoại là thông tin liên hệ, không phải bằng chứng sở hữu. Phiên chưa xác minh chỉ xem/hủy/thanh toán Appointment do chính phiên đó tạo. Một số điện thoại có thể có nhiều phiên khách; không tự trộn lịch giữa các phiên.
3. Trên thiết bị mới, Customer có thể dùng app ngay với tên và số điện thoại. Muốn khôi phục lịch từ phiên cũ cùng số, họ yêu cầu OTP **mô phỏng**. Mã chỉ ghi trong console Auth Service ở môi trường demo, không gửi SMS và không mất phí. OTP hết hạn sau 5 phút, dùng một lần, tối đa 5 lần nhập sai và giới hạn yêu cầu lại 60 giây.
4. Sau khi nhập OTP đúng, phiên hiện tại được đánh dấu đã xác minh số; Core cho xem/hủy/thanh toán các lịch guest có cùng số chuẩn hóa. JWT và quyền này được cấp từ Auth, không nhận số điện thoại do client tự gửi vào API lịch.
5. Dữ liệu Customer email/mật khẩu cũ không được chuyển vào flow mới, nhưng cũng không bị xóa. Đăng nhập email/mật khẩu vẫn dành cho nhân sự hiện tại; các quyết định phân quyền nhân sự trong ADR 0006 vẫn chờ triển khai.

## Giới hạn

OTP demo **không xác minh quyền sở hữu số điện thoại thật**; người có quyền xem console có thể lấy mã. Không sử dụng cách này cho môi trường công khai. Bí mật phiên lưu trên thiết bị cần được bảo vệ như một mật khẩu; mất thiết bị hoặc xóa dữ liệu app thì phải khôi phục bằng OTP. Lịch Customer cũ không có số điện thoại trong bản ghi không nằm trong phạm vi khôi phục theo số.
