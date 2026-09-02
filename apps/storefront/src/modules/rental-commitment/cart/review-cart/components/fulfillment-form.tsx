import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { CheckCircle2, LoaderCircle, MapPin, Truck } from "lucide-react";
import { useId } from "react";
import { formatDeliveryAddressSummary } from "../cart-checkout.utils";
import {
	useCartFulfillmentContext,
	useCartPricingContext,
} from "../cart-page.context";

export function FulfillmentForm() {
	const fulfillment = useCartFulfillmentContext();
	const {
		delivery,
		deliveryNotServiceableReason,
		isPriceLoading,
		isPriceError,
	} = useCartPricingContext();
	const addressSummary = fulfillment.hasConfirmedDeliveryAddress
		? formatDeliveryAddressSummary(fulfillment.deliveryRequest)
		: null;
	const isQuotingDelivery =
		fulfillment.fulfillmentMethod === "DELIVERY" &&
		fulfillment.hasConfirmedDeliveryAddress &&
		isPriceLoading;
	const deliveryStatusMessage = deliveryNotServiceableReason
		? getDeliveryUnavailableMessage(deliveryNotServiceableReason)
		: null;

	return (
		<section className="rounded-xl border bg-card p-5">
			<h2 className="flex items-center gap-2 text-lg font-bold">
				<Truck className="size-5" /> Entrega
			</h2>
			<div className="mt-4 grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant={
						fulfillment.fulfillmentMethod === "PICKUP" ? "default" : "outline"
					}
					onClick={() => fulfillment.selectFulfillmentMethod("PICKUP")}
				>
					Retiro
				</Button>
				<Button
					type="button"
					variant={
						fulfillment.fulfillmentMethod === "DELIVERY" ? "default" : "outline"
					}
					onClick={() => fulfillment.selectFulfillmentMethod("DELIVERY")}
				>
					Envío
				</Button>
			</div>
			{fulfillment.fulfillmentMethod === "DELIVERY" && addressSummary && (
				<>
					<button
						type="button"
						onClick={() => fulfillment.setDeliverySheetOpen(true)}
						className="mt-4 flex w-full items-start gap-2 rounded-lg bg-muted p-3 text-left text-sm"
					>
						<MapPin className="mt-0.5 size-4 shrink-0" />
						<span>
							<span className="block font-semibold">Dirección de entrega</span>
							<span className="text-muted-foreground">{addressSummary}</span>
						</span>
					</button>
					{isQuotingDelivery ? (
						<p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
							<LoaderCircle className="size-4 animate-spin" />
							Consultando disponibilidad de entrega...
						</p>
					) : delivery && !isPriceError ? (
						<p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
							<CheckCircle2 className="size-4" />
							Entrega disponible en esta dirección.
						</p>
					) : deliveryStatusMessage && !isPriceError ? (
						<p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
							{deliveryStatusMessage}
						</p>
					) : null}
				</>
			)}
			<DeliveryAddressSheet />
		</section>
	);
}

function getDeliveryUnavailableMessage(
	reason: ReturnType<
		typeof useCartPricingContext
	>["deliveryNotServiceableReason"],
): string {
	switch (reason) {
		case "CUSTOMER_LOCATION_UNRESOLVED":
		case "CUSTOMER_LOCATION_AMBIGUOUS":
			return "No pudimos encontrar esa dirección. Revisala e intentá nuevamente.";
		case "BEYOND_MAX_DISTANCE":
			return "La dirección está fuera de nuestra zona de entrega.";
		case "DELIVERY_OUTSIDE_SERVICE_HOURS":
			return "No podemos realizar la entrega en el horario seleccionado.";
		case "COLLECTION_OUTSIDE_SERVICE_HOURS":
			return "No podemos realizar el retiro en el horario seleccionado.";
		default:
			return "La entrega no está disponible para esta reserva.";
	}
}

function DeliveryAddressSheet() {
	const addressId = useId();
	const {
		draftDeliveryRequest,
		isDeliverySheetOpen,
		showDeliveryError,
		setDeliverySheetOpen,
		setDraftDeliveryAddress,
		confirmDeliveryRequest,
	} = useCartFulfillmentContext();

	return (
		<Sheet open={isDeliverySheetOpen} onOpenChange={setDeliverySheetOpen}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Dirección de entrega</SheetTitle>
					<SheetDescription>
						Ingresá la dirección completa donde querés recibir el equipo.
					</SheetDescription>
				</SheetHeader>
				<div className="px-4 pb-4">
					{showDeliveryError && (
						<p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							Ingresá una dirección antes de confirmar.
						</p>
					)}
					<div className="text-xs font-semibold">
						<label htmlFor={addressId}>Dirección *</label>
						<Input
							id={addressId}
							className="mt-1.5"
							value={draftDeliveryRequest.address}
							onChange={(event) => setDraftDeliveryAddress(event.target.value)}
							placeholder="Av. Santa Fe 1234, Palermo, CABA"
						/>
					</div>
				</div>
				<SheetFooter className="border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => setDeliverySheetOpen(false)}
					>
						Cancelar
					</Button>
					<Button type="button" onClick={confirmDeliveryRequest}>
						Confirmar dirección
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
