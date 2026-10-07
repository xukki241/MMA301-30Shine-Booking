# Admin Web — Shop Admin

Admin Web dùng React/Vite để đăng nhập Shop Admin, quản lý chi nhánh, dịch vụ, stylist được gán và Work Shift theo ngày.

## Chạy local

Yêu cầu Node.js 24 LTS và MongoDB theo cấu hình hai backend.

```powershell
cd services/auth-service
npm ci
npm run dev

# Terminal khác
cd services/core-api
npm ci
npm run dev

# Terminal khác
cd apps/admin-web
npm ci
Copy-Item .env.example .env
npm run dev
```

Mở `http://localhost:5173`. Cấu hình `.env`:

```dotenv
VITE_AUTH_API_URL=http://localhost:4101
VITE_CORE_API_URL=http://localhost:4102
```

Admin Web không có tài khoản demo mặc định. Dùng tài khoản `shop_admin` đã đăng ký trong Auth Service; không đăng ký tài khoản mới bằng thông tin giả trên môi trường dùng chung.

## Luồng và quyền

- Đăng nhập gửi email/mật khẩu tới `POST /auth/login`; UI chỉ giữ phiên nếu role trả về là `shop_admin`.
- Token được giữ trong `sessionStorage` cho phiên tab và gửi dưới dạng Bearer khi gọi API ghi.
- Core API kiểm tra JWT và role. Customer/Stylist không thể ghi dữ liệu quản trị và bị UI từ chối với thông báo 403.
- Stylist assignment yêu cầu `userId` của tài khoản Stylist đã có. Màn hình không tạo user trong Auth Service.
- Work Shift lưu ngày lịch tại địa phương cùng `startAt`/`endAt` ISO 8601 có timezone. Ca trùng bị từ chối; sửa/xóa ca có Appointment đang chiếm thời gian cũng bị từ chối.
- Cần xóa ca của một chi nhánh trước khi xóa chi nhánh; cần xóa ca của stylist trước khi hủy gán hoặc chuyển stylist sang chi nhánh khác.
- API slot public tạo khung theo `durationMinutes` của Service; mobile dùng API này và cần đăng nhập Customer để xác nhận booking.

## Kiểm tra

```powershell
npm run build
```

Core API contract tests: từ `services/core-api`, chạy `npm test`. Cấu hình MongoDB theo README Core API để chạy catalog/integration checks.
