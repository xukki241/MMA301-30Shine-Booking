import { Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useDemoLoading } from "@/hooks/use-demo-loading";

export default function CustomerAppointmentsScreen() {
  const isLoading = useDemoLoading();

  return (
    <Screen
      eyebrow="Customer"
      title="Lịch hẹn của tôi"
      description="Theo dõi trạng thái booked, completed, paid hoặc cancelled tại đây."
    >
      {isLoading ? (
        <LoadingState label="Đang tải lịch hẹn..." />
      ) : (
        <EmptyState
          icon="📭"
          title="Chưa có lịch hẹn"
          description="Danh sách sẽ hiển thị sau khi API đặt lịch được kết nối."
        />
      )}
    </Screen>
  );
}
