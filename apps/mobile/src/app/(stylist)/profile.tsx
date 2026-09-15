import { Card, CardText, CardTitle, Screen } from "@/components/screen";

export default function StylistProfileScreen() {
  return (
    <Screen
      eyebrow="Stylist"
      title="Hồ sơ làm việc"
      description="Thông tin demo để xác nhận ứng dụng đã điều hướng vào đúng shell Stylist."
    >
      <Card>
        <CardTitle>Stylist demo</CardTitle>
        <CardText>Chi nhánh: Chưa được phân công</CardText>
        <CardText>Work Shift: Shop Admin quản lý</CardText>
      </Card>
      <Card>
        <CardTitle>Quyền trong MVP</CardTitle>
        <CardText>
          Stylist xem lịch ngày và hoàn thành appointment của chính mình; không
          tự tạo ca làm việc.
        </CardText>
      </Card>
    </Screen>
  );
}
