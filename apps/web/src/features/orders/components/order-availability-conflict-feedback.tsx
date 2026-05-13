import type { OrderAvailabilityConflictDisplayModel } from "@/features/orders/order-availability-conflict.display-model";
import { OrderAvailabilityConflictPanel } from "@/features/orders/components/order-availability-conflict-panel";

export function OrderAvailabilityConflictFeedback({
	model,
}: {
	model: OrderAvailabilityConflictDisplayModel;
}) {
	return (
		<div className="space-y-3">
			<OrderAvailabilityConflictPanel model={model} />
		</div>
	);
}
