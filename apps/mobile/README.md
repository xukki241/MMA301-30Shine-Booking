# Mobile Expo — Customer, Stylist và General Manager

Customer có thể khám phá Home trước khi đăng nhập. Đặt lịch cần tài khoản số điện thoại: số mới đi qua OTP demo, mật khẩu 6 số và họ tên; số đã đăng ký dùng mật khẩu. Giao diện đặt lịch chạy Salon → Stylist/ngày/giờ → Dịch vụ → xác nhận. Ứng dụng xem trước giờ trống theo các dịch vụ của salon và kiểm tra lại giờ cho dịch vụ đã chọn trước khi xác nhận.

## Environment and run

Requires Node.js 24 LTS, npm and Expo SDK 57. Configure API URLs by copying `.env.example` to `.env`:

```dotenv
EXPO_PUBLIC_CORE_API_URL=http://10.0.2.2:4102
EXPO_PUBLIC_AUTH_API_URL=http://10.0.2.2:4101
```

Use `localhost` for a local web/browser runtime. Android Emulator uses `10.0.2.2`; a physical device needs the computer's LAN IP. Start MongoDB, Auth Service and Core API, then:

```powershell
cd apps/mobile
npm ci
npm run android
```

Stylist và General Manager đăng nhập tài khoản nhân sự bằng email/mật khẩu; app chuyển đến khu vực theo role. OTP demo chỉ được ghi ở console Auth Service, không gửi SMS, không mất phí. Khách chưa đăng nhập nhấn tên/avatar trên Home để vào **Tài khoản**, rồi chọn **Thông tin tài khoản** để đăng nhập/đăng ký; thành công sẽ trở về hồ sơ. Khách đã đăng nhập có thể chỉnh sửa họ tên, email, ngày sinh, ảnh đại diện và một địa chỉ nhà tùy chọn. Số điện thoại chỉ đọc. Ngày sinh chọn và hiển thị theo DD-MM-YYYY. Địa chỉ nhà chọn từ 34 tỉnh/thành phố và phường/xã tương ứng, sau đó nhập số nhà/tên đường; không có địa chỉ nhận hàng hoặc nút xóa tài khoản. Ảnh được chọn từ thư viện, thu nhỏ dưới 200 KiB và lưu ở Auth Service cho bản demo.

## Checks

```powershell
npm run typecheck
npm test
npm run export:android
```

`export:android` checks Metro/Hermes bundling; it does not create an APK or replace device testing.

## Current scope

- Customer: Home công khai, trang Tài khoản và hồ sơ, catalog, slot từ Work Shift, đặt/hủy lịch, lịch sử tài khoản và thanh toán MoMo/VNPay mô phỏng sau khi Stylist hoàn thành. Mọi màn thanh toán ghi rõ không trừ tiền thật.
- Stylist: đăng nhập nhân sự, xem lịch được giao, ghi nhận khách đã đến, hoàn thành phục vụ; sau 15 phút chưa ghi nhận có cảnh báo để kiểm tra và xác nhận `no_show`. Có thể hoàn tác check-in trong 5 phút.
- General Manager: bốn khu vực **Tổng quan**, **Lịch đặt**, **Vận hành** và **Thanh toán**. Manager chọn một ngày hoặc tất cả ngày để xem báo cáo/lịch đặt, chọn chi nhánh bằng dropdown, quản lý chi nhánh/dịch vụ/hồ sơ thợ/ca và xem thanh toán theo khoảng ngày hoặc toàn thời gian.
- System Admin chỉ dùng Admin Web, không vào mobile.
- Booking source is `src/booking/http-adapter.ts`; the interface is `src/booking/types.ts`.
- Metro giữ cache cũ: `npm start -- --clear`.
- Không thấy emulator: mở Android Studio > Device Manager và khởi động thiết bị.
- Điện thoại không tải được bundle: thử `npx expo start --tunnel`.

## SHINE-20: đọc cache khi mất mạng

App dùng NetInfo để hiện banner khi offline. Màn Lịch hẹn Customer dùng AsyncStorage
để lưu snapshot đọc thành công và đọc lại khi mất mạng; cache sai schema hoặc
không tồn tại sẽ hiện trạng thái rỗng rõ ràng. `npm run test:offline` kiểm tra
cache đọc, trạng thái mạng và guard từ chối booking offline. Guard không tạo
queue hoặc tự gửi lại thao tác khi có mạng.

Màn Lịch hẹn online đọc từ Core API khi có Guest Session. Cache được tách theo
Guest Session và trạng thái khôi phục để dữ liệu của phiên khác không lẫn nhau.
Màn demo dùng nguồn dữ liệu riêng khi bật `EXPO_PUBLIC_USE_DEMO_API=true`.

### Kiểm tra Airplane mode trên Android sau khi có luồng online

1. Kết nối mạng, mở lịch hoặc danh mục và đợi dữ liệu tải thành công.
2. Bật Airplane mode, mở lại danh sách: banner offline xuất hiện và dữ liệu đã
   tải vẫn hiển thị. Nếu chưa tải lần nào, thấy trạng thái không có cache.
3. Thử xác nhận booking: thấy lỗi không thể đặt lịch khi ngoại tuyến; không có
   lịch mới được tạo.
4. Bật mạng lại và tải lại danh sách. Xác nhận dữ liệu mới được tải và booking
   bị từ chối trước đó không tự gửi lại.
