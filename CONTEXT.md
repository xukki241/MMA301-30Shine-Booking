# 30Shine Booking

Ứng dụng đặt lịch cắt tóc theo chi nhánh cho Customer, có chọn Stylist. Đặt lịch giữ chỗ trước; thanh toán mô phỏng (MoMo/VNPay) sau khi hoàn thành dịch vụ. Dự án độc lập với LMS Classroom; cùng pattern kỹ thuật (Expo + Core API + một Auth Service) nhưng docs/repo tách riêng.

## Language

### Actors

**Customer**:
Khách đặt lịch giữ chỗ; sau khi dịch vụ `completed`, tự thanh toán mô phỏng trên app.
_Avoid_: User, client (khi nói role nghiệp vụ)

**Stylist**:
Thợ cắt tóc được Customer chọn; làm theo Work Shift do Shop Admin xếp; xem lịch ngày và đánh dấu hoàn thành.
_Avoid_: Barber, staff (trừ copy UI)

**Shop Admin**:
Người vận hành chi nhánh: quản lý Branch, Service, Stylist gắn chi nhánh, tạo/sửa Work Shift, xem lịch và thống kê nhẹ.
_Avoid_: Admin hệ thống toàn cục, manager (trừ UI)

**User**:
Tài khoản đăng nhập; gắn một role Customer, Stylist, hoặc Shop Admin.
_Avoid_: Account

### Booking flow (thứ tự nghiệp vụ)

Customer chọn **Branch → Service → Stylist → Time Slot → Appointment (giữ chỗ)**.
Stylist đánh dấu **completed** → Customer **Payment** mô phỏng trên app → **paid**.

**Branch**:
Chi nhánh cửa hàng nơi khách đến cắt; chọn trước Service.
_Avoid_: Store, salon (trừ branding)

**Service**:
Dịch vụ tại Branch (tên, thời lượng, giá).
_Avoid_: Product, package

**Stylist**:
(xem Actors) — bắt buộc chọn thợ trong luồng đặt lịch đã chốt.

**Work Shift**:
Ca làm việc của Stylist tại một Branch; **chỉ Shop Admin** tạo/sửa trong MVP. Stylist không tự khai báo ca.
_Avoid_: Schedule, availability (khi nói thực thể ca)

**Time Slot**:
Ô giờ trống suy ra từ Work Shift trừ các Appointment đã giữ.
_Avoid_: Calendar cell

**Appointment**:
Lịch đặt của Customer: Branch + Service + Stylist + Time Slot.
_Avoid_: Order, reservation

**Appointment Status**:
Vòng đời gợi ý: `booked` → `completed` → `paid` (hoặc `cancelled` từ `booked`).
_Avoid_: State ngoài enum đã chốt; thu tiền trước khi hoàn thành dịch vụ

**Payment**:
Thanh toán mô phỏng (MoMo/VNPay fake) do **Customer** thực hiện trên app sau khi Appointment `completed`; bắt buộc trong scope vì yêu cầu đồ án.
_Avoid_: Billing thật; thu tiền lúc vừa đặt lịch; POS thu ngân là bước bắt buộc MVP
