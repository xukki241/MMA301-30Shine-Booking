# ADR 0011: Thanh toán tiền mặt hoặc chuyển khoản SePay sau dịch vụ

Trạng thái: Đã chốt luồng nghiệp vụ; chờ thông tin tài khoản ngân hàng và xác thực webhook.

## Bối cảnh

Ứng dụng hiện cho Customer chọn MoMo/VNPay và tự ghi kết quả thanh toán mô phỏng sau khi lịch hẹn hoàn thành. Cách này không xác nhận được tiền thực nhận. Người dùng yêu cầu bỏ hai lựa chọn đó, cho khách chọn tiền mặt hoặc chuyển khoản; chuyển khoản hiển thị QR có thể lưu về máy và dùng SePay để xác nhận giao dịch thật.

## Quyết định

- Giữ thời điểm thanh toán sau khi Stylist đánh dấu lịch hẹn `completed`.
- Khi dịch vụ hoàn thành, lịch ở `completed` và được coi là chờ thanh toán. Khách có thể trả ngay hoặc quay lại màn lịch hẹn để trả sau; không tự hủy lịch, tự ghi `paid` hay tạo khoản thanh toán mới chỉ vì khách thoát màn hình.
- Khách chọn tiền mặt hoặc chuyển khoản. Chọn phương thức chỉ ghi ý định thanh toán, không xác nhận đã nhận tiền. Khách có thể đổi phương thức khi lịch vẫn chờ thanh toán.
- Với tiền mặt, nhân viên có quyền thu ngân tại chi nhánh xác nhận đã nhận đủ tiền, ghi người xác nhận và thời điểm, rồi backend mới đổi lịch sang `paid`.
- Với chuyển khoản, dùng một tài khoản ngân hàng chung đã kết nối SePay cho mọi chi nhánh.
- Tạo nội dung chuyển khoản riêng, ổn định cho từng lịch hẹn; QR chứa số tài khoản, số tiền chốt của lịch và nội dung này. Cho phép khách lưu ảnh QR.
- Màn hình hiển thị cả ngân hàng, chủ tài khoản, số tài khoản, số tiền và nội dung chuyển khoản để khách kiểm tra.
- Với chuyển khoản, chỉ backend đổi lịch sang `paid` sau khi xác thực webhook SePay, khớp tài khoản nhận, nội dung và số tiền. Webhook trùng lặp không được ghi tiền hai lần.
- Nếu chưa cấu hình tài khoản hoặc khóa xác thực, API không phát QR thanh toán; giao diện báo chưa thể thanh toán.

## Điểm cần chốt trước khi kết nối Live

- Tên ngân hàng, số tài khoản và tên chủ tài khoản chung.
- SePay webhook dùng HMAC-SHA256 hay API Key. Khóa lưu ở biến môi trường trên máy chủ.
- Thời hạn thanh toán và quy trình nhắc nợ chưa được yêu cầu; mặc định lịch giữ ở `completed` cho đến khi có xác nhận thu tiền. Danh sách quản lý cần lọc được lịch hoàn thành chưa thanh toán để nhân viên theo dõi.
- Quy trình xử lý chuyển thiếu/thừa tiền và giao dịch không khớp; mặc định không tự đánh dấu `paid`, chuyển đối soát thủ công.

## Tài liệu nhà cung cấp

- [Tạo QR động](https://docs.sepay.vn/tao-qr-code-vietqr-dong.html)
- [Tích hợp webhook](https://docs.sepay.vn/tich-hop-webhooks.html)
