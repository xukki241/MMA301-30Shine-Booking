# Admin Web — SHINE-26

Admin Web dùng React/Vite với hai vùng riêng theo role:

| Role | Màn hiện có | API ghi |
|---|---|---|
| `system_admin` | Tài khoản nhân sự, Health, Audit Log | `/admin/users` trên Auth Service |
| `general_manager` | Danh mục Branch/Service/Stylist và Work Shift | Catalog/Work Shift trên Core API |

Customer Guest và Stylist không vào Admin Web. System Admin không có menu vận hành và Core API từ chối role này khi ghi catalog hoặc xem Work Shift. General Manager không vào API tài khoản/health/audit. Manager theo dõi lịch và Payment Attempt theo Branch vẫn thuộc phần triển khai sau.

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
VITE_CORE_API_URL=http://localhost:4102
```

Database cũ tự chuyển `shop_admin` sang `system_admin` khi Auth Service khởi động. Với database mới chưa có Admin, chạy một lần `npm run bootstrap:admin` trong Auth Service sau khi đặt `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong `.env`; sau đó xóa hai biến này. System Admin đăng nhập và tạo General Manager đầu tiên.

## Hành vi chính

- Tài khoản nhân sự: tạo, xem, sửa email/role/mật khẩu, khóa mềm và khôi phục. Customer Guest không nằm trong danh sách.
- Khóa hoặc đổi role làm JWT nhân sự đang dùng mất hiệu lực khi Auth/Core kiểm tra lại. Chặn thao tác với Stylist còn ca tương lai hoặc lịch `booked`/`completed`.
- Health cho biết trạng thái Auth, Core và database của mỗi service cùng thời điểm kiểm tra.
- Audit Log gộp metadata từ Auth và Core, lọc action/kết quả/ngày; không lưu mật khẩu, token, OTP hoặc dữ liệu thanh toán nhạy cảm.
- Manager vận hành catalog và ca trên mọi chi nhánh. Slot công khai vẫn được tạo từ Work Shift và thời lượng Service.

## Kiểm tra

```powershell
npm run build
npm test --prefix ../../services/auth-service
npm test --prefix ../../services/core-api
```
