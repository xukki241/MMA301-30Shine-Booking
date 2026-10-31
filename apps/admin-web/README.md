# Admin Web — SHINE-26

Admin Web dùng React/Vite dành riêng cho System Admin:

| Role | Màn hiện có | API ghi |
|---|---|---|
| `system_admin` | Tài khoản nhân sự, Health, Audit Log | `/admin/users` trên Auth Service |

Customer Guest, Stylist và General Manager không vào Admin Web. Manager dùng chung app Expo với Customer và Stylist. System Admin không có menu vận hành; Core API từ chối role này khi đọc dữ liệu lịch, thanh toán và khi ghi catalog hoặc xem Work Shift.

## Chạy local

Khởi động MongoDB, Auth Service (`:4101`), Core API (`:4102`) và Admin Web (`:5173`). Auth và Core dùng cùng `JWT_SECRET`; cấu hình `CORE_API_URL` ở Auth và `AUTH_SERVICE_URL` ở Core để kiểm tra phiên và ca/lịch liên dịch vụ.

```powershell
cd services/auth-service
npm ci
Copy-Item .env.example .env
npm run dev

# Terminal khác
cd services/core-api
npm ci
Copy-Item .env.example .env
npm run dev

# Terminal khác
cd apps/admin-web
npm ci
Copy-Item .env.example .env
npm run dev
```

Admin Web `.env`:

```dotenv
VITE_AUTH_API_URL=http://localhost:4101
```

Database cũ tự chuyển `shop_admin` sang `system_admin` khi Auth Service khởi động. Với database mới chưa có Admin, chạy một lần `npm run bootstrap:admin` trong Auth Service sau khi đặt `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong `.env`; sau đó xóa hai biến này. System Admin đăng nhập và tạo General Manager đầu tiên.

## Hành vi chính

- Tài khoản nhân sự: tạo, xem, sửa email/role/mật khẩu, khóa mềm và khôi phục. Customer Guest không nằm trong danh sách.
- Khóa hoặc đổi role làm JWT nhân sự đang dùng mất hiệu lực khi Auth/Core kiểm tra lại. Chặn thao tác với Stylist còn ca tương lai hoặc lịch `booked`/`completed`.
- Health cho biết trạng thái Auth, Core và database của mỗi service cùng thời điểm kiểm tra.
- Audit Log gộp metadata từ Auth và Core, lọc action/kết quả/ngày; không lưu mật khẩu, token, OTP hoặc dữ liệu thanh toán nhạy cảm.
- Manager vận hành catalog, ca, lịch và thanh toán mô phỏng trên mọi chi nhánh trong app Expo. Slot công khai vẫn được tạo từ Work Shift và thời lượng Service.

## Kiểm tra

```powershell
npm run build
npm test
npm test --prefix ../../services/auth-service
npm test --prefix ../../services/core-api
```
