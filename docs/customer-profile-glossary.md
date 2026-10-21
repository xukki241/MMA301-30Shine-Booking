# Thuật ngữ hồ sơ Customer

| Thuật ngữ | Nghĩa trong tính năng này |
|---|---|
| **Trang Tài khoản** | Màn điều hướng cá nhân cho cả GUEST và Customer đã đăng nhập. Không tự cấp quyền đọc hồ sơ. |
| **Hồ sơ Customer** | Dữ liệu cá nhân thuộc một `CustomerAccount` trong Auth Service; chỉ chủ tài khoản đã xác thực xem/sửa được. |
| **Thông tin cá nhân** | Họ tên, số điện thoại, email, ngày sinh và ảnh đại diện. Số điện thoại là định danh đăng nhập, chỉ đọc ở hồ sơ. |
| **Địa chỉ nhà** (`homeAddress`) | Địa chỉ không bắt buộc; khi thêm mới cần đủ tỉnh/thành phố, phường/xã, số nhà và tên đường. Trường `district` cũ được giữ trong API để đọc địa chỉ đã lưu, nhưng để trống khi tạo địa chỉ theo hệ thống hai cấp. Không phải địa chỉ giao hàng. |
| **GUEST** | Khách đang khám phá Home chưa có JWT Customer. Có thể xem trang Tài khoản nhưng phải đăng nhập/đăng ký để vào hồ sơ. |
| **Ảnh đại diện** (`avatar`) | Ảnh tùy chọn của Customer; không có ảnh thì dùng hình mặc định. |
