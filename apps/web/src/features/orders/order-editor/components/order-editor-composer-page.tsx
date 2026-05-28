import { DraftOrderComposerPage } from "@/features/orders/draft-order/components/draft-order-composer-page";
import { buildOrderAvailabilityConflictDisplayModel } from "@/features/orders/order-availability-conflict.display-model";
import type { OrderEditorMode } from "@/features/orders/order-editor/types/order-editor.types";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export function OrderEditorComposerPage({
	mode,
	orderId,
	order,
}: {
	mode: OrderEditorMode;
	orderId?: string;
	order: ParsedOrderDetailResponseDto;
}) {
	return (
		<DraftOrderComposerPage
			mode={mode}
			orderId={orderId}
			buildConflictDisplayModel={(conflict) =>
				buildOrderAvailabilityConflictDisplayModel({ order, conflict })
			}
		/>
	);
}
