import { OrderStatus } from "@repo/types";
import type { Dayjs } from "dayjs";
import type { OrderEditAvailability } from "@/features/orders/order-editor/types/order-editor.types";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export function getOrderEditAvailability(
	order: Pick<ParsedOrderDetailResponseDto, "status" | "pickupAt" | "signing">,
	referenceDate: Dayjs,
): OrderEditAvailability {
	if (order.status === OrderStatus.DRAFT) {
		return { canEdit: true, mode: "edit-draft" };
	}

	if (
		order.status !== OrderStatus.PENDING_REVIEW &&
		order.status !== OrderStatus.CONFIRMED
	) {
		return { canEdit: false, reason: "unsupported-status" };
	}

	if (
		order.pickupAt.isSame(referenceDate) ||
		order.pickupAt.isBefore(referenceDate)
	) {
		return { canEdit: false, reason: "pickup-started" };
	}

	if (
		order.status === OrderStatus.CONFIRMED &&
		order.signing.status === "SIGNED"
	) {
		return { canEdit: false, reason: "signed" };
	}

	return {
		canEdit: true,
		mode:
			order.status === OrderStatus.PENDING_REVIEW
				? "edit-pending-review"
				: "edit-confirmed",
	};
}
