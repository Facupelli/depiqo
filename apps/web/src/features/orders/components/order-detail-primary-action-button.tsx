import { OrderStatus } from "@repo/types";
import { CheckCircle2, RotateCcw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	useOrderConfirmation,
	useOrderDetailContext,
	useOrderLifecycle,
} from "@/features/orders/contexts/order-detail.context";
import type { getOrderPrimaryAdminAction } from "@/features/orders/order.utils";

function getPrimaryAdminButtonConfig({
	action,
	onConfirm,
	onPickup,
	onReturn,
}: {
	action: ReturnType<typeof getOrderPrimaryAdminAction>;
	onConfirm: () => void;
	onPickup: () => void;
	onReturn: () => void;
}) {
	if (!action) {
		return null;
	}

	switch (action.action) {
		case "confirm":
			return {
				icon: CheckCircle2,
				onClick: onConfirm,
			};
		case "pickup":
			return {
				icon: Truck,
				onClick: onPickup,
			};
		case "return":
			return {
				icon: RotateCcw,
				onClick: onReturn,
			};
		default:
			return null;
	}
}

export function OrderDetailPrimaryActionButton({
	action,
}: {
	action: ReturnType<typeof getOrderPrimaryAdminAction>;
}) {
	const { order } = useOrderDetailContext();
	const confirmation = useOrderConfirmation();
	const lifecycle = useOrderLifecycle();
	const config = getPrimaryAdminButtonConfig({
		action,
		onConfirm: confirmation.openDialog,
		onPickup: lifecycle.openPickup,
		onReturn: lifecycle.openReturn,
	});

	if (!config) {
		return null;
	}

	const Icon = config.icon;

	return (
		<Button
			className="h-auto justify-start rounded-xl bg-emerald-600 px-4 py-2 text-left text-white hover:bg-emerald-700"
			onClick={config.onClick}
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 rounded-full bg-white/15 p-1.5">
					<Icon className="h-4 w-4" />
				</div>
				<div>
					<p className="text-sm font-semibold leading-none">
						{action?.action === "confirm" &&
						order.status === OrderStatus.PENDING_REVIEW
							? "Aprobar solicitud"
							: action?.label}
					</p>
					<p className="mt-1 text-xs text-white/80">{action?.description}</p>
				</div>
			</div>
		</Button>
	);
}
