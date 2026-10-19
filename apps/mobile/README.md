# Mobile Expo — Customer + Stylist

Customer nhập tên + số điện thoại ở màn bắt đầu, không cần email/mật khẩu. App nhận Guest Session từ Auth Service rồi chạy Booking Wizard Branch → Service → Stylist → date/slot → review → confirm. Lịch trên cùng thiết bị được giữ qua bí mật phiên; trên thiết bị mới, Customer có thể vào app ngay và dùng OTP demo để khôi phục lịch cũ cùng số.

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

Màn Customer không còn form email/mật khẩu. Màn Stylist vẫn đăng nhập tài khoản nhân sự bằng email/mật khẩu. OTP demo chỉ được ghi ở console Auth Service, không gửi SMS, không mất phí; để thử khôi phục, vào **Lịch hẹn → Lấy mã khôi phục**, đọc mã trên server rồi nhập vào app. Phiên chưa khôi phục chỉ thấy lịch do thiết bị đó đặt. `deviceSecret` hiện lưu trong AsyncStorage cho bản demo; cần storage bảo mật hơn trước khi phát hành công khai.

## Checks

```powershell
npm run typecheck
npm run test:appointments
npm run export:android
```

`export:android` checks Metro/Hermes bundling; it does not create an APK or replace device testing.

## Current scope

- Customer: real catalog, Work Shift-derived slots and booking POST.
- Stylist schedule and Customer appointment list still use the existing demo/placeholder data sources.
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
