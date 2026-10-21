# Auth Service — Customer Account và tài khoản nhân sự

Auth Service chạy ở `:4101`, dùng MongoDB và cùng `JWT_SECRET` với Core API. Customer mới đăng ký bằng số điện thoại, OTP demo, mật khẩu 6 số và họ tên; Customer cũ đăng nhập bằng số điện thoại và mật khẩu. Nhân sự đăng nhập bằng email/mật khẩu. User nhân sự có đúng một role: `stylist`, `system_admin`, hoặc `general_manager`.

## Cấu hình và chạy

```powershell
cd services/auth-service
npm ci
Copy-Item .env.example .env
npm run dev
```

Đặt `MONGODB_URI`, `JWT_SECRET` (ít nhất 32 byte) và `CORE_API_URL` trong `.env`. Core API cần cùng `JWT_SECRET` và `AUTH_SERVICE_URL` trỏ về Auth. Auth và Core cần MongoDB hoạt động trước khi mở cổng HTTP.

Database có tài khoản `shop_admin` cũ sẽ tự chuyển chúng thành `system_admin` khi Auth khởi động. Với database mới chưa có Admin, đặt `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong `.env`, chạy **một lần**:

```powershell
npm run bootstrap:admin
```

Sau khi tạo thành công, xóa hai biến bootstrap khỏi `.env`. System Admin đăng nhập Admin Web và tạo General Manager đầu tiên. Không có tài khoản demo mặc định. Endpoint công khai `/auth/register` trả 410; không thể tự đăng ký tài khoản nhân sự.

## Customer Account và hồ sơ

| Method | Path | Nội dung |
|---|---|---|
| POST | `/auth/customer/lookup` | `{phone}` → số đã có tài khoản hay chưa |
| POST | `/auth/customer/register/request`, `/verify`, `/complete` | OTP demo, mật khẩu 6 số, họ tên → JWT Customer |
| POST | `/auth/customer/login` | `{phone, password}` → JWT Customer |
| POST | `/auth/customer/reset/request`, `/verify`, `/complete` | Đặt lại mật khẩu bằng OTP demo |
| GET | `/auth/customer/introspect` | Kiểm tra phiên Customer hiện hành |
| GET | `/auth/customer/profile` | JWT Customer → `id`, `name`, `phone`, `email`, `birthDate`, `avatar`, `homeAddress` |
| PATCH | `/auth/customer/profile` | JWT Customer → cập nhật các trường hồ sơ cho chính tài khoản đó |

OTP demo hết hạn sau 5 phút, dùng một lần, tối đa 5 lần sai và yêu cầu lại sau 60 giây. **Không gửi SMS, không mất phí và không chứng minh quyền sở hữu số thật.** Bật/tắt bằng `DEMO_OTP_ENABLED`. Endpoint Guest cũ trả 410 khi Customer Account đang bật.

Email, ngày sinh, ảnh đại diện và địa chỉ nhà không bắt buộc. `homeAddress` là `null` hoặc đủ bốn trường `province`, `district`, `ward`, `streetAddress` (số nhà và tên đường), mỗi phần tối đa 120 ký tự. `birthDate` dùng `YYYY-MM-DD`, là ngày hợp lệ không ở tương lai; email được chuẩn hóa chữ thường. `avatar` là `null` hoặc data URI JPEG/PNG tối đa 200 KiB ảnh giải mã. PATCH từ chối trường lạ, số điện thoại không sửa được ở hồ sơ. GET/PATCH yêu cầu Bearer JWT Customer hiện hành, trả `Cache-Control: no-store`, không trả mật khẩu/OTP và không có địa chỉ nhận hàng.

## Nhân sự và System Admin

| Method | Path | Quyền |
|---|---|---|
| POST | `/auth/login` | Nhân sự active; nhận JWT có role và `authVersion` |
| GET | `/auth/introspect` | Kiểm tra phiên nhân sự hiện hành cho Core API |
| GET/POST | `/admin/users` | System Admin xem danh sách/tạo User nhân sự |
| GET/PATCH | `/admin/users/:id` | System Admin xem/sửa email, role, mật khẩu |
| POST | `/admin/users/:id/lock`, `/restore` | Khóa mềm/khôi phục |
| GET | `/admin/health` | Trạng thái Auth/Core và hai database; `checkedAt` |
| GET | `/admin/audit` | Audit metadata Auth + Core; lọc `action`, `result`, `from`, `to` |

Khóa/đổi role tăng `authVersion`; Core hỏi Auth ở mỗi request nhân sự nên JWT cũ mất hiệu lực. Auth hỏi Core trước khi khóa/đổi role Stylist; nếu còn Work Shift tương lai hoặc Appointment `booked`/`completed`, thao tác bị từ chối. Nếu Core không sẵn sàng, thao tác cũng bị từ chối. System Admin cuối cùng không thể bị khóa/đổi role theo kiểm tra số tài khoản đang hoạt động.

Audit Log chỉ lưu actor, action, target, result và thời điểm; không ghi body, mật khẩu, token, OTP hay dữ liệu thanh toán nhạy cảm. Core lưu audit của thao tác vận hành trong database riêng, Auth tổng hợp khi Admin tra cứu.

## Kiểm tra

```powershell
npm test
# Tùy chọn, yêu cầu TEST_MONGODB_URI tới database test riêng:
npm run test:integration
```

Unit test dùng repository double; chúng không thay thế kiểm thử với MongoDB thật. Integration test dùng collection hoặc database test có tên ngẫu nhiên và dọn chúng khi kết thúc. Chỉ trỏ `TEST_MONGODB_URI` tới MongoDB dành cho kiểm thử.
