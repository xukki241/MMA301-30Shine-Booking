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

SHINE-12 admin-web CRUD/Work Shift và phần Work Shift/Time Slot của SHINE-06 đã chuyển quyền ghi sang **`general_manager`** trong SHINE-26. Manager thao tác trên app Expo, còn Admin Web chỉ phục vụ System Admin; xem [08-admin-web.md](./08-admin-web.md). Mobile Booking Wizard dùng catalog/slot thật và tạo booking có Customer Guest JWT.

Flow Customer nhập tên + số điện thoại đã có trong Auth Service, Core API và Mobile. Guest Session chỉ xem lịch của mình trên thiết bị hiện tại; OTP demo đọc từ console Auth Service mở quyền xem lịch guest cũ cùng số. OTP không gửi SMS. Xem [ADR 0007](./adr/0007-customer-name-phone-guest-session.md). Bản ghi tài khoản Customer email/mật khẩu cũ vẫn có thể nằm trong database nhưng endpoint đăng ký công khai đã đóng và login nhân sự từ chối chúng. Ranh giới `system_admin`/`general_manager` đã được triển khai trong SHINE-26.

## Phân quyền và System Admin (SHINE-26)

Auth/Core/Admin Web đã có `system_admin` và `general_manager`, chuyển `shop_admin` cũ, tài khoản nhân sự CRUD qua khóa mềm, health và audit metadata. Customer Guest không nằm trong màn quản trị. Kiểm tra phiên nhân sự qua Auth khiến khóa/đổi role có hiệu lực ở Core. Admin Web hiện chỉ nhận System Admin; Manager vào app Expo. Test Auth, Work Shift và hợp đồng hai service với MongoDB thật đã qua. UI mới cần kiểm thử trên thiết bị/emulator.

## Trạng thái luồng Manager mobile và thanh toán mô phỏng

| Hạng mục | Trạng thái code |
|---|---|
| Manager mobile | Đã có Tổng quan, Lịch đặt chỉ đọc/lọc, Vận hành Branch/Service/Stylist/Work Shift và lịch sử Payment Attempt theo Branch |
| Thanh toán có lịch sử | Core lưu giá chốt và attempt thành công/thất bại; tổng thu chỉ tính thành công; mobile ghi rõ không trừ tiền thật |
| Giá cũ và thử lại | Test Core bao phủ thay đổi giá sau đặt và thanh toán thất bại rồi thử lại |
| Kiểm thử thiết bị còn lại | Cần chạy hành trình Customer → Stylist → Manager và Admin trên emulator/thiết bị với Auth/Core/Mongo thật, gồm lỗi phụ thuộc và audit |

Các mục đã có code là trạng thái triển khai, không thay cho kiểm thử UI trên thiết bị. ADR 0006 và Chương 2–3 là nguồn yêu cầu; OpenAPI mô tả API đang chạy.
