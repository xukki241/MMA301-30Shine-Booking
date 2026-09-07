# Thanh toán mô phỏng bắt buộc; chọn thợ; Branch trước Service

Luồng Customer chốt: Branch → Service → Stylist → Time Slot → Appointment → Payment mô phỏng (MoMo/VNPay). Có chọn thợ. Payment nằm trong scope bắt buộc theo yêu cầu đồ án, không phải nice-to-have. Kiến trúc vẫn chỉ tách Auth Service; không thêm microservice nghiệp vụ. Các hạng mục chat, push, map, review/tip, thống kê phức tạp và phân quyền admin nặng được ghi nhận là mở rộng điểm cao — sẽ xếp tầng sau khi chốt ai sở hữu Work Shift, tránh lặp lại scope phình như LMS cũ.
