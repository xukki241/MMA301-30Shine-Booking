# Mobile Expo — Customer + Stylist

## SHINE-10: Customer Booking Wizard

Chọn **Customer** ở màn đầu, rồi bấm **Đặt lịch** tại Trang chủ để mở
`/(customer)/book`. Wizard đi theo thứ tự **Branch → Service → Stylist → ngày/Time Slot
→ xem lại → xác nhận**. Quay lại một bước giữ lựa chọn trước đó; đổi Branch sẽ xóa
các lựa chọn phụ thuộc, đổi Service xóa Stylist/Slot, đổi Stylist hoặc ngày xóa Slot.
Không thể tiếp tục hay xác nhận nếu thiếu lựa chọn bắt buộc.

**Data mode hiện tại: demo adapter local.** Trên `develop` hiện chỉ có Core API
`/health` và `/auth/me`; chưa có Catalog, Time Slot hoặc Book API. Dataset demo
nằm trong `src/booking/demo-adapter.ts`, tách khỏi UI, gồm hai Branch, nhiều
Service/Stylist và slot thay đổi theo Stylist/ngày. Chủ nhật không có slot;
slot trong quá khứ bị lọc. Xác nhận trả về kết quả demo có trạng thái `booked`
nhưng **không gọi server, không giữ chỗ thật và không lưu vào “Lịch của tôi”**.
Demo không mô phỏng thuật toán Work Shift hoặc chống double-book của backend.

`src/booking/types.ts` định nghĩa `BookingWizardDataSource`. Khi SHINE-05
(Catalog), SHINE-06 (Work Shift/Time Slot) và SHINE-07 (Book API) có mặt trên
`develop`, thay `demoBookingAdapter` trong màn book bằng REST adapter khớp
contract thực tế. Khi nối REST, cấu hình base URL bằng `EXPO_PUBLIC_CORE_API_URL`
phù hợp emulator/thiết bị; không dùng `localhost` cố định. SHINE-10 hiện chưa
dùng biến URL này vì chưa có REST adapter. Auth/JWT mobile còn chờ phần tích hợp
riêng; không gửi booking thật bằng role demo.

### Checklist Android cho SHINE-10

1. Mở Customer → Trang chủ → Đặt lịch; chọn Branch, Service, Stylist, ngày và slot, xem lại rồi xác nhận. Kiểm tra kết quả ghi rõ **demo** và `booked`.
2. Ở bước slot, bấm Quay lại: Stylist đã chọn vẫn còn. Đổi Branch và kiểm tra Service/Stylist/Slot được xóa; đổi Service hoặc Stylist thì Slot được xóa.
3. Chọn một ngày Chủ nhật: thấy trạng thái không có slot và có thể chọn ngày khác. Ngày hiện tại chỉ hiển thị slot còn ở tương lai.
4. Ở trang xem lại, thử nhấn xác nhận hai lần nhanh: chỉ một lần gửi từ UI. Nếu slot hết hạn trước khi xác nhận, lỗi hiển thị inline và có thể quay lại chọn slot khác.
5. Kiểm tra theme sáng/tối, nhãn accessibility cho lựa chọn/nút, màn Android nhỏ cuộn đến được CTA. Tab Trang chủ/Lịch hẹn và role guard vẫn hoạt động.

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
3. Mở Lịch hẹn: thấy lịch mẫu, thử hủy lịch `booked` và kiểm tra trạng thái `cancelled`.
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
màn đầu. Lịch hẹn Customer dùng data source demo của SHINE-11; danh sách Stylist
vẫn dùng loading/empty state mẫu.

## SHINE-11: Lịch của tôi / hủy

Customer xem lịch mẫu với bốn trạng thái. Chỉ lịch `booked` có thể hủy sau bước
xác nhận. Chạy `npm run test:appointments` để kiểm tra quy tắc hủy. Data source
nằm trong `src/appointments/` để có thể thay bằng REST adapter sau này. Dữ liệu
chỉ nằm trong bộ nhớ: khởi động lại app sẽ tạo lại lịch mẫu; không gửi request
hủy tới server. `origin/develop` chưa có API lấy lịch theo Customer hoặc auth
mobile. Booking demo SHINE-10 trên branch riêng không lưu vào danh sách này.

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
