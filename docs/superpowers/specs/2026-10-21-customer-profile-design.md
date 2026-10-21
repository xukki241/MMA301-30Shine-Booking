# Hồ sơ Customer và trang Tài khoản — thiết kế

Ngày: 2026-10-21  
Trạng thái: Đã được duyệt ngày 2026-10-21; triển khai theo `docs/superpowers/plans/2026-10-21-customer-profile.md`.

## Mục tiêu

Khách nhấn tên hoặc avatar trên Home để vào trang Tài khoản. Khách chưa đăng nhập vẫn xem được trang Tài khoản, nhưng phải đăng nhập hoặc đăng ký trước khi xem hồ sơ cá nhân. Customer đã đăng nhập có thể xem và sửa thông tin của chính mình. Giao diện lấy ba ảnh tham khảo làm hướng bố cục, không sao chép các chức năng không thuộc ứng dụng đặt lịch.

## Điều hướng và trạng thái

- Tên/avatar trên Home mở trang Tài khoản trong khu vực Customer. Trang này hiển thị GUEST và lời mời đăng nhập khi chưa có JWT; khi có JWT hiển thị tên và số điện thoại hiện có.
- Mục **Thông tin tài khoản** mở trang hồ sơ nếu đã đăng nhập. Nếu chưa, mở `/login?next=profile`; sau đăng nhập hoặc đăng ký thành công chuyển tới trang hồ sơ. Đóng/hủy đăng nhập trở về phần Customer mà không tạo hồ sơ giả.
- Trang Tài khoản có lối vào lịch sử cắt hiện có, địa chỉ nhà và đăng xuất khi đã đăng nhập. Không tạo Shop, đơn hàng, ưu đãi, OTP giao dịch hoặc thông tin salon chỉ vì xuất hiện trong ảnh mẫu.
- Địa chỉ nhà trên trang Tài khoản dẫn tới phần địa chỉ của hồ sơ; hồ sơ có thể mở và lưu địa chỉ từ cùng trang. Khi phiên hết hạn, dữ liệu riêng được ẩn và khách được mời đăng nhập lại.

## Hồ sơ và chỉnh sửa

- Thông tin cá nhân: họ tên bắt buộc đã có từ đăng ký; số điện thoại chỉ đọc vì là định danh đăng nhập; email, ngày sinh và ảnh đại diện tùy chọn, bổ sung sau trong hồ sơ.
- Địa chỉ nhà hoàn toàn không bắt buộc khi đăng ký hoặc sử dụng hồ sơ. Nếu Customer tự chọn thêm địa chỉ, form chọn một trong 34 tỉnh/thành phố, lọc phường/xã trực thuộc rồi nhập `streetAddress` (số nhà và tên đường). Không hiển thị cấp quận/huyện theo hệ thống hành chính hai cấp hiện hành. API vẫn giữ `district` để tương thích địa chỉ cũ; địa chỉ mới gửi chuỗi rỗng. Người dùng có thể để trống toàn bộ hoặc xóa địa chỉ đã lưu. Danh mục địa giới được lưu trong app từ Open Admin Data (CC-BY-4.0, cập nhật 2026-09-08), không gọi dịch vụ địa giới lúc nhập.
- Email được chuẩn hóa chữ thường và kiểm tra định dạng cơ bản; ngày sinh được chọn và hiển thị theo `DD-MM-YYYY`, API lưu `YYYY-MM-DD`, không ở tương lai. Không hiển thị ngày sinh mặc định giả như `01-01-1900`.
- Chọn ảnh từ thư viện thiết bị, xem trước và tải ảnh đã thu nhỏ lên Auth Service. Chỉ nhận JPEG/PNG tối đa 200 KiB sau xử lý; server kiểm tra loại và kích thước trước khi lưu. Ảnh chỉ được đọc khi có phiên Customer. Nếu không chọn ảnh, dùng avatar mặc định.
- Trang hồ sơ có **Chỉnh sửa**, **Đăng xuất** và trạng thái đang tải/lỗi/thử lại. Không có nút xóa tài khoản, địa chỉ cơ quan, nơi hay đi lại, hoặc địa chỉ nhận hàng.

## Mô hình miền và API

`CustomerAccount` trong Auth Service là nguồn dữ liệu duy nhất cho hồ sơ. Bổ sung trường tùy chọn `email`, `birthDate`, `avatar` và `homeAddress`; không tạo thực thể địa chỉ giao hàng. `homeAddress` gồm bốn thành phần trên và thuộc đúng một CustomerAccount. Số điện thoại vẫn là khóa tài khoản duy nhất theo ADR 0008; cập nhật hồ sơ không thay đổi số điện thoại hay mật khẩu.

Thêm API `GET /auth/customer/profile` và `PATCH /auth/customer/profile`, chỉ chấp nhận JWT Customer còn hiệu lực và `authVersion` đúng. GET trả các trường hồ sơ an toàn; PATCH chỉ cho phép tên, email, ngày sinh, avatar và địa chỉ nhà, từ chối khóa không biết và dữ liệu sai. Không trả `passwordHash`, mã OTP hoặc thông tin đăng nhập nội bộ. `introspect` và response đăng nhập/đăng ký giữ dữ liệu gọn; app gọi GET khi mở hồ sơ, cập nhật trạng thái sau PATCH thành công. Chỉnh sửa không cấp quyền cho tài khoản khác.

Ảnh được truyền trong yêu cầu cập nhật hồ sơ dưới dạng dữ liệu ảnh giới hạn kích thước cho bản demo, không dùng URL ngoài làm nguồn tin cậy. Giới hạn body và quy tắc kích thước cần thống nhất với cấu hình Express. Trường avatar có thể được xóa về `null`.

## Lỗi và bảo vệ dữ liệu

- Lỗi mạng khi tải hồ sơ hiển thị thử lại; không dùng bản sao cũ để ngụ ý dữ liệu đã được lưu. Lỗi lưu giữ nội dung form để khách sửa và gửi lại.
- API trả 401 cho token thiếu, hết hạn hoặc bị thu hồi; app xóa phiên cũ và đưa khách tới đăng nhập. Dữ liệu hồ sơ không lưu trong cache công khai hoặc log.
- Cập nhật chỉ ghi các trường cho phép, chuẩn hóa dữ liệu ở server. Các phiên đăng nhập khác thấy dữ liệu mới khi tải lại hồ sơ.

## Kiểm tra chấp nhận

1. GUEST nhấn tên/avatar thấy trang Tài khoản; vào Thông tin tài khoản được dẫn qua đăng nhập/đăng ký và quay lại hồ sơ.
2. Customer đăng nhập nhấn tên/avatar thấy trang Tài khoản, mở hồ sơ đúng tài khoản; số điện thoại chỉ đọc.
3. Sửa tên, email, ngày sinh, ảnh và địa chỉ nhà; đăng xuất, đăng nhập lại trên cùng hoặc thiết bị khác vẫn thấy dữ liệu đã lưu.
4. Bỏ trống toàn bộ địa chỉ được; nhập thiếu tỉnh/thành phố, phường/xã hoặc số nhà/đường, email sai, ngày không hợp lệ, ảnh sai loại/quá lớn bị từ chối mà không ghi dữ liệu lỗi.
5. Khách vãng lai và JWT sai không đọc/sửa được hồ sơ; Customer A không sửa được hồ sơ Customer B.
6. Giao diện không có địa chỉ nhận hàng hoặc nút xóa tài khoản.

## Ngoài phạm vi

Không tích hợp SMS thật, bản đồ, gợi ý địa giới, đổi số điện thoại, xóa tài khoản, đơn hàng hoặc chương trình thành viên. Các mục ngoài nghiệp vụ đặt lịch trong ảnh chỉ là tham khảo bố cục.
