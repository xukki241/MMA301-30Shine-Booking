# Chương 1. Giới thiệu đề tài

## 1.1. Tên đề tài

**Ứng dụng đặt lịch cắt tóc** cho hệ thống cửa hàng theo mô hình chuỗi (tham chiếu thương hiệu **30Shine**): khách đặt lịch theo chi nhánh, chọn dịch vụ và thợ, cửa hàng quản lý ca làm việc và lịch trong ngày.

## 1.2. Bối cảnh

Chuỗi salon cần giảm thời gian chờ và điều phối thợ theo ca. Ứng dụng di động phía khách giúp giữ chỗ trước; phía cửa hàng cần công cụ xếp ca và theo dõi lịch. Nhóm không sao chép toàn bộ hệ thống vận hành thương mại (POS thật, loyalty, marketing…) mà xây **vòng nghiệp vụ đặt lịch–hoàn thành–thanh toán mô phỏng** đủ rõ để demo và chấm điểm.

## 1.3. Mục tiêu

| Mục tiêu | Mô tả |
|----------|--------|
| Nghiệp vụ | Khách đặt lịch có chọn thợ; thợ hoàn thành lịch; khách thanh toán mô phỏng sau khi cắt |
| Vận hành | Shop Admin quản lý chi nhánh, dịch vụ, thợ và **xếp ca (Work Shift)** |
| Kỹ thuật | React Native + REST + DB; Auth Service tách; Core API một process; web admin nhẹ |
| Học thuật | Đáp ứng đề cương môn (API thật, Android, cổng thanh toán mô phỏng, phân quyền) |

## 1.4. Đối tượng sử dụng

| Vai trò | Mô tả |
|---------|--------|
| **Customer** | Khách đặt lịch, hủy lịch chưa thực hiện, thanh toán sau khi dịch vụ hoàn thành |
| **Stylist** | Thợ xem lịch trong ngày, đánh dấu hoàn thành |
| **Shop Admin** | Quản lý Branch / Service / Stylist / Work Shift, theo dõi lịch |

## 1.5. Phạm vi

### Trong phạm vi (MVP)

1. Đăng ký / đăng nhập theo vai trò.  
2. Luồng khách: **Chi nhánh → Dịch vụ → Thợ → Ngày/giờ (slot) → Đặt lịch (`booked`)**.  
3. Shop Admin tạo Work Shift; hệ thống suy ra slot trống = ca − lịch đã giữ.  
4. Stylist đánh dấu `completed`.  
5. Customer thanh toán **MoMo/VNPay mô phỏng** trên app → `paid`.  
6. Hủy lịch ở trạng thái `booked` (chưa thu tiền).  
7. Mobile (Customer + Stylist) và web admin tối thiểu cho Shop Admin.  

### Ngoài phạm vi / làm sau nếu còn thời gian

Chat, push notification thật, bản đồ/GPS, review/tip, thống kê phức tạp, phân quyền admin rất mịn, thanh toán cổng thật.

## 1.6. Kết quả nghiệm thu mong đợi

Demo Android: đặt lịch → thợ hoàn thành → khách thanh toán mô phỏng thành công; admin xếp được ca; không double-book cùng thợ–slot; mã nguồn và tài liệu trên GitHub/Notion đồng bộ.  
