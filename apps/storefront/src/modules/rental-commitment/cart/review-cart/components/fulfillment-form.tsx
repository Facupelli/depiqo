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
import { Textarea } from "@repo/ui/components/textarea";
import { MapPin, Truck } from "lucide-react";
import { useId } from "react";
import type { DeliveryRequestField } from "../cart-checkout.types";
import { formatDeliveryAddressSummary } from "../cart-checkout.utils";
import { useCartFulfillmentContext } from "../cart-page.context";

export function FulfillmentForm() {
	const fulfillment = useCartFulfillmentContext();
	const addressSummary = fulfillment.hasConfirmedDeliveryAddress
		? formatDeliveryAddressSummary(fulfillment.deliveryRequest)
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
					disabled={!fulfillment.branch.supportsDelivery}
					onClick={() => fulfillment.selectFulfillmentMethod("DELIVERY")}
				>
					Envío
				</Button>
			</div>
			{!fulfillment.branch.supportsDelivery && (
				<p className="mt-3 text-xs text-muted-foreground">
					Esta sucursal solo ofrece retiro.
				</p>
			)}
			{fulfillment.fulfillmentMethod === "DELIVERY" && addressSummary && (
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
			)}
			<DeliveryAddressSheet />
		</section>
	);
}

function DeliveryAddressSheet() {
	const notesId = useId();
	const {
		draftDeliveryRequest,
		isDeliverySheetOpen,
		showDeliveryError,
		setDeliverySheetOpen,
		setDraftDeliveryField,
		confirmDeliveryRequest,
	} = useCartFulfillmentContext();

	return (
		<Sheet open={isDeliverySheetOpen} onOpenChange={setDeliverySheetOpen}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Dirección de entrega</SheetTitle>
					<SheetDescription>
						Completá los datos obligatorios para solicitar envío.
					</SheetDescription>
				</SheetHeader>
				<div className="space-y-4 px-4 pb-4">
					{showDeliveryError && (
						<p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							Completá todos los campos obligatorios antes de confirmar.
						</p>
					)}
					<div className="grid gap-3 sm:grid-cols-2">
						<DeliveryInput
							label="Destinatario"
							field="contactName"
							value={draftDeliveryRequest.contactName}
							onChange={setDraftDeliveryField}
						/>
						<DeliveryInput
							label="Teléfono"
							field="contactPhone"
							value={draftDeliveryRequest.contactPhone}
							onChange={setDraftDeliveryField}
						/>
					</div>
					<DeliveryInput
						label="Dirección"
						field="addressLine1"
						value={draftDeliveryRequest.addressLine1}
						onChange={setDraftDeliveryField}
					/>
					<DeliveryInput
						label="Dirección adicional"
						field="addressLine2"
						value={draftDeliveryRequest.addressLine2}
						onChange={setDraftDeliveryField}
						required={false}
					/>
					<div className="grid gap-3 sm:grid-cols-2">
						<DeliveryInput
							label="Ciudad"
							field="city"
							value={draftDeliveryRequest.city}
							onChange={setDraftDeliveryField}
						/>
						<DeliveryInput
							label="Provincia / región"
							field="state"
							value={draftDeliveryRequest.state}
							onChange={setDraftDeliveryField}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<DeliveryInput
							label="Código postal"
							field="postalCode"
							value={draftDeliveryRequest.postalCode}
							onChange={setDraftDeliveryField}
						/>
						<DeliveryInput
							label="País"
							field="country"
							value={draftDeliveryRequest.country}
							onChange={setDraftDeliveryField}
						/>
					</div>
					<div className="text-xs font-semibold">
						<label htmlFor={notesId}>Notas de entrega</label>
						<Textarea
							id={notesId}
							className="mt-1.5 min-h-24"
							value={draftDeliveryRequest.notes}
							onChange={(event) =>
								setDraftDeliveryField("notes", event.target.value)
							}
							placeholder="Ej: llamar antes de llegar"
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

function DeliveryInput({
	label,
	field,
	value,
	onChange,
	required = true,
}: {
	label: string;
	field: DeliveryRequestField;
	value: string;
	onChange: (field: DeliveryRequestField, value: string) => void;
	required?: boolean;
}) {
	return (
		<div className="text-xs font-semibold">
			<label htmlFor={`delivery-${field}`}>
				{label}
				{required ? " *" : ""}
			</label>
			<Input
				id={`delivery-${field}`}
				className="mt-1.5"
				value={value}
				onChange={(event) => onChange(field, event.target.value)}
			/>
		</div>
	);
}
