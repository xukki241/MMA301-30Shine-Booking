# Chương 5. Tổ chức nhóm và phân công

## 5.1. Thành viên và năng lực

| Họ tên | Track | Ghi chú |
|--------|-------|---------|
| Nguyễn Xuân Kiên | Khó | Auth, chống double-book, máy trạng thái, review |
| Nguyễn Anh Tú | Khó | Core API book, tính slot, complete |
| Nguyễn Quốc Hưng | Khó | Payment mô phỏng + màn Customer pay |
| Nguyễn Quang Lộc | Medium | Wizard đặt lịch + lịch của tôi |
| Ngô Quang Huy | Medium→dễ | Admin CRUD + màn Stylist; cần checklist |

## 5.2. Ma trận phân công

| Thành viên | Backend / hạ tầng | UI |
|------------|-------------------|-----|
| Kiên | Scaffold, Auth Service, anti double-book, status `booked→completed→paid` | Review |
| Tú | API book, slot từ Work Shift, complete | Contract mobile |
| Hưng | Payment mock MoMo/VNPay | Màn thanh toán sau completed |
| Lộc | — | Branch→Service→Stylist→Slot; My appointments / hủy |
| Huy | — | Admin-web CRUD + Stylist lịch hôm nay |

## 5.3. Quy tắc

- Docs/repo **độc lập** với LMS.  
- Song song nhiều task hai dự án.  
- Huy nhận task kèm checklist.  
- Mỗi người ≥ 2 màn hình; commit đủ repo 30Shine.  

## 5.4. Definition of Done

Tương tự LMS: chạy được phần mình, không hard-code luồng chính, có loading/lỗi cơ bản, PR có cách test, đúng repo.

## 5.5. Liên kết

- Notion: https://app.notion.com/p/3d41a3267e3e8167aba3ef159c164a65  
- GitHub: https://github.com/xukki241/MMA301-30Shine-Booking  
