# Shop Admin sở hữu Work Shift

> Quyết định lịch sử cho code hiện tại. [ADR 0006](./0006-separate-system-admin-and-general-manager.md) chuyển quyền xếp ca sang `general_manager` trong thiết kế mục tiêu.

Trong MVP, chỉ Shop Admin tạo và sửa Work Shift cho Stylist theo chi nhánh. Stylist không tự khai báo ca; Stylist xem lịch theo ca đã xếp và đánh dấu Appointment hoàn thành. Mô hình này gần chuỗi salon (Fresha/Booksy/30Shine vận hành) và giảm số màn/phân quyền cho đồ án nhóm.
