# Backlog Project Tracking — hiện trạng và thiết kế mục tiêu

Backlog SHINE-01–14 dưới đây phản ánh **phạm vi và tiến độ ban đầu**. [Project Tracking — MVP trên Notion](https://app.notion.com/p/74f45a69e6d946a58c0f19fa10512eef) chưa được đồng bộ với thiết kế bốn role trong repo.

| ID | Owner | Track | Task |
|----|-------|-------|------|
| SHINE-01 | Kiên | Khó | Expo mobile Customer/Stylist |
| SHINE-02 | Kiên | Khó | Auth đa role + JWT |
| SHINE-03 | Kiên | Khó | Anti double-book + status machine |
| SHINE-04 | Kiên | Khó | Checklist cho Huy |
| SHINE-05 | Tú | Khó | Catalog Branch/Service/Stylist API |
| SHINE-06 | Tú | Khó | Work Shift + Time Slot |
| SHINE-07 | Tú | Khó | Book + complete API |
| SHINE-08 | Hưng | Khó | Payment mock API |
| SHINE-09 | Hưng | Khó | Mobile pay sau complete |
| SHINE-10 | Lộc | Medium | Wizard đặt lịch |
| SHINE-11 | Lộc | Medium | Lịch của tôi / hủy |
| SHINE-12 | Huy | Medium | Admin-web CRUD + Work Shift |
| SHINE-13 | Huy | Dễ | Stylist lịch hôm nay |
| SHINE-14 | Kiên | Khó | E2E book→complete→pay |

SHINE-12 admin-web CRUD/Work Shift và phần Work Shift/Time Slot của SHINE-06 đã được triển khai với role **`shop_admin`**; xem [08-admin-web.md](./08-admin-web.md) để biết hiện trạng. Mobile Booking Wizard dùng catalog/slot thật và tạo booking có Customer JWT; các phần còn lại cần xác nhận bằng code trước khi đánh dấu hoàn thành.

Flow Customer nhập tên + số điện thoại đã có trong Auth Service, Core API và Mobile. Guest Session chỉ xem lịch của mình trên thiết bị hiện tại; OTP demo đọc từ console Auth Service mở quyền xem lịch guest cũ cùng số. OTP không gửi SMS. Xem [ADR 0007](./adr/0007-customer-name-phone-guest-session.md). API email/mật khẩu Customer cũ vẫn tồn tại trong code để tương thích, nhưng Mobile không dùng; phần tách `system_admin`/`general_manager` vẫn thuộc backlog mục tiêu.

## Backlog mới từ thiết kế mục tiêu (chưa triển khai)

| Hạng mục | Kết quả cần có |
|---|---|
| Tách role và chuyển đổi | `shop_admin` cũ → `system_admin`; Admin tạo `general_manager`; đăng ký công khai chỉ tạo Customer; quyền Core/admin web đổi theo ma trận |
| Tài khoản | CRUD qua khóa mềm/khôi phục, một role/User, vô hiệu phiên khi khóa/đổi role, chặn thao tác Stylist còn ca/lịch |
| Manager web | Tổng quan/lọc lịch mọi Branch, catalog, Stylist Profile và Work Shift dưới quyền Manager |
| Thanh toán có lịch sử | Giá chốt lúc đặt; Payment Attempt thành công/thất bại theo Branch; thống kê chỉ tính thành công; UI ghi không trừ tiền thật |
| Health và audit | Admin xem Auth/Core/database và thời điểm kiểm tra; audit metadata thao tác quan trọng |
| Tài liệu và kiểm thử | Cập nhật OpenAPI/README triển khai sau khi code đổi; test quyền chéo, khóa nhầm Customer, chặn khóa Stylist, giá cũ và thử lại thanh toán |

Các hạng mục trên là **thiết kế và việc cần làm**, không phải tuyên bố đã triển khai. ADR 0006 và Chương 2–3 là nguồn yêu cầu mục tiêu; không đổi hợp đồng API công khai trước khi code tương ứng tồn tại.
