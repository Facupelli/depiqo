import { FulfillmentMethod } from "@repo/types";
import { MapPin, Truck } from "lucide-react";
import { SidebarCardHeader } from "@/features/orders/components/order-detail-sidebar-primitives";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";

export function OrderLogisticsCard() {
	const { order } = useOrderDetailContext();
	const {
		bookingSnapshot,
		deliveryRequest,
		fulfillmentMethod,
		location,
		pickupAt,
		returnAt,
	} = order;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<SidebarCardHeader
				icon={<Truck className="size-4" />}
				title="Logística"
			/>

			<div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
						Fecha de retiro
					</p>
					<p className="text-sm font-medium text-neutral-900">
						{bookingSnapshot.pickupDate.format("MMM DD, YYYY")}
						<span className="text-neutral-400 mx-1">·</span>
						{pickupAt.tz(bookingSnapshot.timezone).format("HH:mm")}
					</p>
				</div>
				<div>
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
						Fecha de devolución
					</p>
					<p className="text-sm font-medium text-neutral-900">
						{bookingSnapshot.returnDate.format("MMM DD, YYYY")}
						<span className="text-neutral-400 mx-1">·</span>
						{returnAt.tz(bookingSnapshot.timezone).format("HH:mm")}
					</p>
				</div>
			</div>

			<div className="border-t border-neutral-100 pt-3">
				<p className="text-xs text-neutral-400 mb-1.5">
					{fulfillmentMethod === FulfillmentMethod.DELIVERY
						? "Solicitó delivery"
						: "Retiro en punto de entrega"}
				</p>
				<div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
					<MapPin className="size-3.5 text-neutral-400 shrink-0" />
					{location.name}
				</div>
			</div>

			{deliveryRequest && (
				<div className="border-t border-neutral-100 mt-3 pt-3">
					<p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
						Pedido de Delivery
					</p>
					<div className="space-y-1 text-sm text-neutral-700">
						<p className="font-medium text-neutral-900">
							{deliveryRequest.recipientName}
						</p>
						<p>{deliveryRequest.phone}</p>
						<p>
							{deliveryRequest.addressLine1}
							{deliveryRequest.addressLine2
								? `, ${deliveryRequest.addressLine2}`
								: ""}
						</p>
						<p>
							{deliveryRequest.city}, {deliveryRequest.stateRegion}{" "}
							{deliveryRequest.postalCode}
						</p>
						<p>{deliveryRequest.country}</p>
						{deliveryRequest.instructions && (
							<p className="text-neutral-500 pt-1">
								{deliveryRequest.instructions}
							</p>
						)}
					</div>
				</div>
			)}
		</section>
	);
}
