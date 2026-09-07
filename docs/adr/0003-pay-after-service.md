# Thanh toán sau khi hoàn thành dịch vụ

Appointment lúc đặt chỉ giữ chỗ (`booked`), không thu tiền trước. Sau khi dịch vụ xong (`completed`), mới chạy Payment mô phỏng MoMo/VNPay tới trạng thái `paid`. Hủy lịch ở trạng thái `booked` không cần hoàn tiền thật/fake phức tạp vì chưa thu. Ai bấm thanh toán (Customer trong app hay Shop Admin tại quầy) còn có thể tinh chỉnh, nhưng thời điểm nghiệp vụ là sau dịch vụ — gần hành vi chuỗi salon thực tế và vẫn thỏa yêu cầu có cổng thanh toán mô phỏng.
