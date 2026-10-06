import { router } from "expo-router";

import {
  Card,
  CardText,
  CardTitle,
  PrimaryButton,
  Screen
} from "@/components/screen";

export default function CustomerHomeScreen() {
  return (
    <Screen
      eyebrow="Customer shell"
      title="Sẵn sàng cho lịch cắt mới?"
      description="Luồng đặt lịch sẽ đi theo đúng thứ tự chi nhánh, dịch vụ, stylist và khung giờ."
    >
      <Card>
        <CardTitle>Đặt lịch theo 4 bước</CardTitle>
        <CardText>Branch → Service → Stylist → Time Slot</CardText>
        <PrimaryButton
          label="Đặt lịch"
          accessibilityHint="Mở wizard chọn chi nhánh, dịch vụ, Stylist và khung giờ"
          onPress={() => router.push("/(customer)/book")}
        />
        <PrimaryButton
          label="Xem khung lịch hẹn"
          accessibilityHint="Mở danh sách lịch hẹn Customer"
          onPress={() => router.push("/(customer)/appointments")}
        />
      </Card>
      <Card>
        <CardTitle>Thanh toán sau dịch vụ</CardTitle>
        <CardText>
          Cổng thanh toán mô phỏng chỉ mở khi Stylist đã đánh dấu lịch hẹn là
          completed.
        </CardText>
      </Card>
    </Screen>
  );
}
