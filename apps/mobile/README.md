# Mobile Expo — Customer + Stylist

Ứng dụng mobile Android của 30Shine Booking. SHINE-01 cung cấp shell và điều
hướng theo hai vai trò mobile; đăng nhập/JWT sẽ được nối ở SHINE-25.

## Yêu cầu môi trường

- Node.js 24 LTS (môi trường kiểm tra: 24.16.0)
- npm
- Android Studio + Android Emulator, hoặc điện thoại Android có Expo Go

## Cài đặt và chạy

```bash
cd apps/mobile
npm ci
npm run android
```

Nếu dùng điện thoại thật, chạy `npm start` rồi quét QR bằng Expo Go. Máy tính và
điện thoại cần ở cùng mạng; nhấn `a` trong terminal để mở Android Emulator.
App dùng Expo SDK 57; Expo Go trên thiết bị phải hỗ trợ SDK 57.
SHINE-01 chạy độc lập, chưa cần bật backend hoặc MongoDB.

## Kiểm tra mã nguồn

```bash
npm run typecheck
npx expo install --check
npm run export:android
```

`export:android` kiểm tra Metro bundle/Hermes cho Android, không tạo APK và
không thay thế việc chạy thử trên thiết bị. Kết quả nằm trong `dist/`, đã được
Git bỏ qua cùng với `node_modules/` và `.expo/`.

## Checklist kiểm tra trên Android

1. Mở app: thấy màn chọn Customer / Stylist.
2. Chọn Customer: mở Trang chủ; bấm "Xem khung lịch hẹn" hoặc tab Lịch hẹn.
3. Lần đầu mở Lịch hẹn: thấy loading ngắn rồi thông báo danh sách rỗng.
4. Bấm "Đổi vai trò", chọn Stylist: mở Hôm nay, thấy loading rồi empty state.
5. Chuyển qua tab Hồ sơ và trở lại Hôm nay.
6. Đổi giao diện sáng/tối trong cài đặt Android: màu nền/chữ cập nhật theo hệ thống.
7. Reload app: trở lại màn chọn vai trò vì role demo chỉ lưu trong bộ nhớ.

Role guard ở đây chỉ phục vụ điều hướng stub; không phải xác thực bảo mật.

## Điều hướng hiện tại

- `/`: màn chọn vai trò tạm thời trong khi chưa có JWT.
- Customer: `/(customer)/home`, `/(customer)/appointments`.
- Stylist: `/(stylist)/today`, `/(stylist)/profile`.

Mỗi nhóm route có guard theo role. Nút **Đổi vai trò** xóa role demo và quay về
màn đầu. Các danh sách hiện dùng loading/empty state mẫu để các task nghiệp vụ
sau có thể thay bằng REST API.

## Lỗi thường gặp

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
