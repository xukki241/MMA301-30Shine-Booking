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

SHINE-12 admin-web CRUD/Work Shift và phần Work Shift/Time Slot của SHINE-06 đã chuyển quyền ghi sang **`general_manager`** trong SHINE-26; xem [08-admin-web.md](./08-admin-web.md) để biết hiện trạng. Mobile Booking Wizard dùng catalog/slot thật và tạo booking có Customer JWT; các phần còn lại cần xác nhận bằng code trước khi đánh dấu hoàn thành.

Flow Customer nhập tên + số điện thoại đã có trong Auth Service, Core API và Mobile. Guest Session chỉ xem lịch của mình trên thiết bị hiện tại; OTP demo đọc từ console Auth Service mở quyền xem lịch guest cũ cùng số. OTP không gửi SMS. Xem [ADR 0007](./adr/0007-customer-name-phone-guest-session.md). Bản ghi tài khoản Customer email/mật khẩu cũ vẫn có thể nằm trong database nhưng endpoint đăng ký công khai đã đóng và login nhân sự từ chối chúng. Ranh giới `system_admin`/`general_manager` đã được triển khai trong SHINE-26.

## Phân quyền và System Admin (SHINE-26)

Auth/Core/Admin Web đã có `system_admin` và `general_manager`, chuyển `shop_admin` cũ, tài khoản nhân sự CRUD qua khóa mềm, health và audit metadata. Customer Guest không nằm trong màn quản trị. Kiểm tra phiên nhân sự qua Auth khiến khóa/đổi role có hiệu lực ở Core. Test Auth, Work Shift và hợp đồng hai service với MongoDB thật đã qua; Admin Web đã được xem trong trình duyệt ở cả hai role trên dữ liệu thử.

## Backlog còn lại từ thiết kế mục tiêu

| Hạng mục | Kết quả cần có |
|---|---|
| Manager web | Tổng quan/lọc lịch mọi Branch, tra cứu Appointment và Payment Attempt theo Branch; catalog/Stylist Profile/Work Shift đã thuộc quyền Manager |
| Thanh toán có lịch sử | Giá chốt lúc đặt; Payment Attempt thành công/thất bại theo Branch; thống kê chỉ tính thành công; UI ghi không trừ tiền thật |
| Kiểm thử tích hợp còn lại | Kiểm tra toàn bộ hành trình UI với dữ liệu nghiệp vụ thật và audit khi dịch vụ phụ thuộc lỗi |
| Thanh toán mục tiêu | Test giá cũ sau sửa Service và thử lại Payment Attempt thất bại |

Các hạng mục trong bảng cuối là **việc cần làm**, không phải tuyên bố đã triển khai. ADR 0006 và Chương 2–3 là nguồn yêu cầu; OpenAPI mô tả code đang chạy.
