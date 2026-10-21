# ADR 0009 — Hồ sơ Customer và địa chỉ nhà

**Trạng thái:** Chấp nhận và triển khai ngày 2026-10-21; xem [spec](../superpowers/specs/2026-10-21-customer-profile-design.md).

## Bối cảnh

ADR 0008 cho phép khám phá Home khi chưa đăng nhập và yêu cầu tài khoản số điện thoại để đặt lịch. App chưa có trang Tài khoản hoặc hồ sơ chỉnh sửa được. Ảnh tham khảo có thông tin cá nhân và nhiều loại địa chỉ, nhưng nghiệp vụ hiện tại chỉ cần địa chỉ nhà.

## Quyết định

1. Nhấn tên/avatar trên Home mở trang Tài khoản cho cả khách vãng lai và Customer đã đăng nhập. Hồ sơ cá nhân yêu cầu đăng nhập/đăng ký; đăng nhập xong quay lại hồ sơ.
2. Auth Service sở hữu hồ sơ Customer: tên, số điện thoại chỉ đọc, email/ngày sinh/ảnh tùy chọn và tối đa một địa chỉ nhà. Địa chỉ nhà không bắt buộc khi đăng ký hoặc sử dụng hồ sơ; nếu khách thêm thì chọn tỉnh/thành phố trong danh mục 34 đơn vị, chọn phường/xã đã lọc và nhập số nhà, tên đường. `district` cũ được giữ để tương thích dữ liệu đã lưu nhưng để trống cho địa chỉ mới.
3. API hồ sơ chỉ đọc/sửa tài khoản của JWT Customer hợp lệ. Số điện thoại, mật khẩu, `authVersion` và dữ liệu nội bộ không thể sửa qua API hồ sơ. Ảnh tùy chọn là JPEG/PNG tối đa 200 KiB sau xử lý và lưu cùng hồ sơ cho bản demo.
4. Không có địa chỉ nhận hàng, địa chỉ cơ quan, nơi hay đi lại hoặc nút xóa tài khoản. Email, ngày sinh và ảnh không bắt buộc khi đăng ký.

## Hệ quả

Auth Service cần trường hồ sơ và endpoint mới; app cần điều hướng Tài khoản, hồ sơ, form sửa và xử lý quay lại sau đăng nhập. Dữ liệu hồ sơ có thể xuất hiện trên thiết bị khác khi đăng nhập cùng tài khoản. Ảnh lưu trong hồ sơ chỉ phù hợp quy mô demo; khi triển khai thật cần dịch vụ lưu file riêng.
