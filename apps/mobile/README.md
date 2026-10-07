# Mobile Expo — Customer + Stylist

Customer Booking Wizard follows Branch → Service → Stylist → date/slot → review → confirm. It loads active catalog entries from Core API, lists available slots generated from Work Shift, then signs in Customer and creates a persisted appointment.

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

At confirmation, sign in with an existing Customer account. The access token stays in memory for this app screen session. The role selector at the entry screen is only a UI navigation demo; backend JWT authorization remains authoritative.

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

Giới hạn của base `develop` hiện tại: chưa có API lấy lịch Customer, catalog,
booking action hay auth mobile. Màn Lịch hẹn online vẫn trả danh sách rỗng mẫu,
nên branch này chưa thể tạo cache lịch thật hoặc demo thao tác booking trên UI.
Khi các luồng online được merge, nối loader lịch/catalog vào read cache và gọi
`runOnlineBooking` tại đúng bước xác nhận booking. Cache lịch demo có key riêng,
không dùng cho tài khoản thật khi auth được thêm sau này.

### Kiểm tra Airplane mode trên Android sau khi có luồng online

1. Kết nối mạng, mở lịch hoặc danh mục và đợi dữ liệu tải thành công.
2. Bật Airplane mode, mở lại danh sách: banner offline xuất hiện và dữ liệu đã
   tải vẫn hiển thị. Nếu chưa tải lần nào, thấy trạng thái không có cache.
3. Thử xác nhận booking: thấy lỗi không thể đặt lịch khi ngoại tuyến; không có
   lịch mới được tạo.
4. Bật mạng lại và tải lại danh sách. Xác nhận dữ liệu mới được tải và booking
   bị từ chối trước đó không tự gửi lại.
