# Thuật ngữ thanh toán SePay

| Thuật ngữ | Nghĩa trong hệ thống |
|---|---|
| **Chờ thanh toán** (`completed`) | Dịch vụ đã xong nhưng chưa có xác nhận nhận đủ tiền. Khách có thể quay lại chọn tiền mặt hoặc chuyển khoản. |
| **Thanh toán tiền mặt** | Nhân viên có quyền thu ngân xác nhận thực thu; thao tác của khách không tự đổi trạng thái. |
| **Yêu cầu thanh toán** | Thông tin chuyển khoản được phát cho một lịch hẹn `completed`: tài khoản nhận, số tiền chốt và nội dung chuyển khoản. |
| **Nội dung chuyển khoản** | Mã duy nhất của lịch hẹn trong giao dịch ngân hàng, dùng để đối soát webhook. |
| **QR chuyển khoản** | Ảnh VietQR tạo từ yêu cầu thanh toán; khách có thể lưu ảnh và quét bằng ứng dụng ngân hàng. |
| **Webhook SePay** | Thông báo giao dịch ngân hàng gửi đến backend. Chỉ webhook đã xác thực mới được xử lý. |
| **Đã thanh toán** (`paid`) | Lịch hẹn có giao dịch tiền vào khớp nội dung, tài khoản nhận và số tiền theo yêu cầu thanh toán. |
| **Giao dịch cần đối soát** | Giao dịch thiếu/thừa tiền, sai nội dung hoặc trùng lặp; không tự chuyển lịch sang `paid`. |
