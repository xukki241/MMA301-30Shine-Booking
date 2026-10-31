# ADR 0010 — Thứ tự chọn trong giao diện đặt lịch Customer

Ảnh tham khảo và yêu cầu ngày 2026-10-21 đổi thứ tự hiển thị thành Salon → Stylist/ngày/giờ → Dịch vụ → chốt giờ. Quyết định này thay phần thứ tự giao diện trong ADR 0002; các quy tắc giữ chỗ và thanh toán sau dịch vụ vẫn giữ nguyên.

Core API tính giờ trống theo thời lượng dịch vụ. Vì khách chọn dịch vụ sau giờ, app tải dịch vụ của salon ở nền, gộp các thời điểm bắt đầu còn trống để xem trước và chỉ cho chọn một stylist. Khi khách chọn dịch vụ, app gọi lại API giờ trống cho đúng dịch vụ đó. Nếu thời điểm đã chọn không còn hợp lệ, app xóa giờ và yêu cầu chọn lại. Khi xác nhận, Core API vẫn kiểm tra lịch và giá ở server.

Danh sách salon, stylist và dịch vụ lấy từ API. Giao diện không hiển thị ảnh stylist, đánh giá, khoảng cách địa lý, ưu đãi hay nhiều dịch vụ khi dữ liệu tương ứng chưa có trong miền ứng dụng.
