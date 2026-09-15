import { Screen } from "@/components/screen";
import { EmptyState, LoadingState } from "@/components/states";
import { useDemoLoading } from "@/hooks/use-demo-loading";

export default function StylistTodayScreen() {
  const isLoading = useDemoLoading();

  return (
    <Screen
      eyebrow="Stylist shell"
      title="Lịch làm việc hôm nay"
      description="Các appointment trong Work Shift được Shop Admin phân công sẽ xuất hiện tại đây."
    >
      {isLoading ? (
        <LoadingState label="Đang tải lịch hôm nay..." />
      ) : (
        <EmptyState
          icon="🪑"
          title="Hôm nay chưa có khách"
          description="Lịch mới sẽ xuất hiện sau khi Core API được kết nối."
        />
      )}
    </Screen>
  );
}
