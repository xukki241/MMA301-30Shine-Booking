# Chương 2. Phân tích yêu cầu — thiết kế mục tiêu

> **Cập nhật RF01:** Customer vào Home không cần đăng nhập. Khi đặt lịch, số mới xác minh OTP demo, đặt mật khẩu 6 số và nhập tên; số đã có tài khoản nhập mật khẩu. Quên mật khẩu dùng OTP demo. Mỗi số điện thoại Việt Nam chỉ có một tài khoản. Xem [ADR 0008](./adr/0008-customer-phone-account-and-public-home.md); các dòng Guest Session bên dưới là lịch sử.

> Ma trận là thiết kế đầy đủ. SHINE-26 đã triển khai ranh giới quyền và System Admin; Core API và app Expo có màn Manager theo dõi lịch và Payment Attempt theo Branch. Cần kiểm thử hành trình UI trên thiết bị. Xem [Chương 8](./08-admin-web.md).

## 2.1. Ma trận quyền

| Chức năng | Customer | Stylist | General Manager | System Admin |
|---|:---:|:---:|:---:|:---:|
| Vào app bằng tên + số điện thoại; khôi phục lịch bằng OTP demo | ✓ | | | |
| Đặt/xem/hủy lịch của mình, thanh toán mô phỏng | ✓ | | | |
| Xem lịch của mình, đánh dấu hoàn thành | | ✓ | | |
| Quản lý Branch/Service/hồ sơ Stylist/Work Shift | | | ✓ | |
| Xem, lọc lịch mọi Branch và lịch sử thanh toán theo Branch | | | ✓ | |
| Tạo/sửa/khóa mềm/khôi phục tài khoản nhân sự và đổi role | | | | ✓ |
| Xem health và audit log | | | | ✓ |

System Admin chỉ xem **metadata sự kiện** trong audit log, không đọc danh mục, lịch hay giao dịch kinh doanh. General Manager không tạo User hoặc đổi role; khi gán Stylist vào Branch, tài khoản `stylist` phải tồn tại trước.

## 2.2. Yêu cầu chức năng

| Mã | Yêu cầu | Actor |
|---|---|---|
| RF01 | Customer bắt đầu bằng tên + số điện thoại, không cần email/mật khẩu; Auth cấp phiên thiết bị/JWT; OTP demo chỉ để khôi phục lịch cũ cùng số | Customer, hệ thống |
| RF02 | CRUD tài khoản nhân sự bằng tạo/xem/sửa/khóa mềm/khôi phục; đổi role; kiểm tra ràng buộc trước khi khóa/đổi role | System Admin |
| RF03 | Xem trạng thái Auth Service, Core API, database và thời điểm kiểm tra gần nhất | System Admin |
| RF04 | Tra cứu audit log thao tác quan trọng; không ghi mật khẩu, token hay dữ liệu thanh toán nhạy cảm | System Admin |
| RF05 | Tạo/sửa/xem Branch, Service (giá/thời lượng), hồ sơ Stylist và gán Branch | General Manager |
| RF06 | Tạo/sửa/xóa Work Shift; xem lịch mọi Branch, lọc theo ngày/Branch/Stylist/trạng thái | General Manager |
| RF07 | Tính Time Slot từ Work Shift, thời lượng Service và Appointment đang chiếm giờ; chống đặt trùng ở lúc xác nhận | Hệ thống |
| RF08 | Đặt lịch Branch → Service → Stylist → Slot, lưu giá chốt lúc đặt; xem và hủy lịch `booked` của mình | Customer |
| RF09 | Xem lịch trong ngày và đánh dấu Appointment của mình `completed` | Stylist |
| RF10 | Thanh toán MoMo/VNPay mô phỏng sau `completed`; ghi mọi lần thử; chỉ lần thành công chuyển `paid` | Customer, hệ thống |
| RF11 | Xem lịch sử Payment Attempt và tổng tiền mô phỏng thành công, lọc theo Branch | General Manager |

## 2.3. Quy tắc nghiệp vụ và tình huống lỗi

- Mỗi User có đúng một role. System Admin không có quyền vận hành; General Manager có quyền trên tất cả Branch nhưng không có quyền quản lý User.
- Tên và số điện thoại không tự cấp quyền với lịch trên thiết bị khác. Phiên chưa xác minh chỉ có quyền với lịch do phiên đó tạo; sau OTP demo, phiên được quyền với lịch guest cùng số điện thoại chuẩn hóa. OTP demo không gửi SMS, không mất phí và không chứng minh quyền sở hữu số thật.
- “Xóa” tài khoản nhân sự trong giao diện là khóa mềm, có thể khôi phục. Customer Guest không nằm trong danh sách tài khoản quản trị và không bị khóa qua màn này.
- Chặn khóa hoặc đổi role Stylist nếu còn Work Shift tương lai hoặc Appointment chưa xử lý. Manager cần xử lý ca/lịch liên quan trước. Không cho hệ thống rơi vào trạng thái không còn System Admin hoạt động.
- Thay đổi role hoặc khóa tài khoản phải làm mất quyền sử dụng phiên đăng nhập hiện có, không chỉ ngăn lần đăng nhập tiếp theo.
- Giá trên Appointment là giá Service tại lúc Customer xác nhận; sửa giá không thay đổi lịch cũ. Payment Attempt dùng đúng giá đã chốt.
- Payment Attempt thất bại giữ Appointment ở `completed` và cho thử lại; chỉ một lần thành công cho một Appointment. Manager thấy cả lần thành công/thất bại, nhưng tổng tiền mô phỏng chỉ cộng lần thành công. Không có tiền thật hay hoàn tiền.
- Work Shift phải bao trùm Appointment; lịch `booked`, `completed`, `paid` chiếm giờ, `cancelled` trả giờ. Khi xác nhận đặt lịch phải kiểm tra lại slot để chống hai Customer đặt cùng thời gian.
- Audit log ghi thao tác quan trọng về User/role, đăng nhập thất bại, catalog, Work Shift, chuyển trạng thái Appointment và Payment Attempt. Bản ghi tối thiểu có actor (có thể chưa xác định khi đăng nhập thất bại), action, loại/id đối tượng, kết quả, thời gian; không chứa nội dung nghiệp vụ hoặc bí mật.

## 2.4. Máy trạng thái Appointment

```text
booked ──(Stylist hoàn thành)──► completed ──(Customer trả mô phỏng thành công)──► paid
   │                                  ▲
   │                                  └── Thanh toán thất bại: giữ completed, ghi Payment Attempt
   └──(Customer hủy)─────────► cancelled
```

Manager chỉ theo dõi trạng thái trong MVP, không tự hoàn thành, thanh toán hoặc hủy thay Customer. Hủy khi `booked` chưa phát sinh hoàn tiền.

## 2.5. Yêu cầu phi chức năng

REST/JSON; JWT cho Customer và nhân sự, mật khẩu băm cho tài khoản nhân sự; Android React Native; web quản trị theo role; một Auth Service tách và một Core API; MongoDB; loading/lỗi cơ bản. Health cơ bản không bao gồm biểu đồ độ trễ/tỷ lệ lỗi/cảnh báo tự động. Thanh toán mô phỏng phải được ghi rõ trên UI là **không trừ tiền thật**.
