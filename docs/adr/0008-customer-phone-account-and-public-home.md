# ADR 0008 — Tài khoản Customer bằng số điện thoại, Home công khai

**Trạng thái:** Chấp nhận; thay thế luồng bắt đầu Guest Session của ADR 0007 cho lịch mới.

## Bối cảnh

ADR 0007 cho Customer đặt lịch bằng phiên thiết bị gắn với tên và số điện thoại. Luồng mới cần cho khách khám phá Home trước khi đăng nhập, nhưng yêu cầu tài khoản khi đặt lịch và chỉ một tài khoản cho mỗi số điện thoại Việt Nam.

## Quyết định

1. Khách có thể vào Home qua “Tôi muốn khám phá thêm” mà không có JWT. Home và dữ liệu danh mục công khai chỉ hiển thị nội dung cần để khám phá. Bấm Đặt lịch yêu cầu xác thực ngay trước khi chọn chi nhánh, dịch vụ, thợ và giờ. Lịch cá nhân cần tài khoản.
2. Customer nhập số điện thoại Việt Nam. Auth chuẩn hóa về `+84…` và tra cứu trong tập tài khoản Customer riêng với User nhân sự và Guest Session. Số chưa đăng ký đi qua OTP mô phỏng, tạo mật khẩu đúng sáu chữ số và nhập tên. Số đã đăng ký nhập mật khẩu. Một số điện thoại có tối đa một tài khoản, bảo vệ bằng unique index.
3. OTP đăng ký và đặt lại mật khẩu chỉ được ghi vào log Auth Service khi bật `DEMO_OTP_ENABLED`; không gửi SMS và không chứng minh quyền sở hữu số thật. OTP hết hạn sau 5 phút, dùng một lần, tối đa 5 lần nhập sai và cách nhau ít nhất 60 giây khi yêu cầu lại.
4. Mật khẩu sáu chữ số được băm trước khi lưu; số lần thử sai được lưu trong MongoDB theo tài khoản và khóa đăng nhập 15 phút sau 5 lần sai. Đặt lại mật khẩu cần OTP và tăng `authVersion` để vô hiệu JWT cũ. Core API kiểm tra phiên Customer với Auth Service trước khi cấp quyền thao tác lịch.
5. Lịch Guest đã có được giữ nguyên trong database, không chuyển vào tài khoản mới dù trùng số điện thoại. Auth ngừng cấp và khôi phục Guest Session; Core từ chối Guest JWT trên mọi API, nên lịch Guest cũ không thể truy cập qua ứng dụng sau chuyển đổi.

## Giới hạn

OTP trong log và mật khẩu sáu chữ số chỉ phù hợp bản demo. Việc gửi SMS thật và chuyển dữ liệu Guest cũ không thuộc phạm vi này.
