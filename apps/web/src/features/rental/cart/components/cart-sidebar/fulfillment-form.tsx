import { FulfillmentMethod } from "@repo/types";
import { CircleHelp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
	DeliveryRequestField,
	DeliveryRequestFormState,
} from "../../cart-order.types";
import { useCartDeliveryContext } from "../../cart-page.context";
import { useDeliveryRequestSheet } from "../../hooks/use-delivery-request-sheet";
import { formatDeliveryAddressSummary } from "../../utils/delivery-address.utils";

export function FulfillmentForm() {
	const {
		supportsDelivery,
		fulfillmentMethod,
		deliveryRequest,
		isDeliveryDetailsRequired,
		onFulfillmentMethodChange,
		onDeliveryRequestFieldChange,
	} = useCartDeliveryContext();
	const deliverySheet = useDeliveryRequestSheet({
		supportsDelivery,
		deliveryRequest,
		onFulfillmentMethodChange,
		onDeliveryRequestFieldChange,
	});
	const addressSummary = deliverySheet.hasConfirmedDeliveryAddress
		? formatDeliveryAddressSummary(deliveryRequest)
		: null;
	const shouldShowDeliveryError =
		isDeliveryDetailsRequired || deliverySheet.showDraftDeliveryError;

	return (
		<>
			<div className="mt-6 border-t border-neutral-200 pt-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex min-w-0 items-center gap-2">
						<MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
						<span className="text-[15px] font-medium text-neutral-700">
							Entrega
						</span>
						<DeliveryInfoPopover />
					</div>

					{supportsDelivery ? (
						<ToggleGroup
							value={[fulfillmentMethod]}
							onValueChange={(groupValue) => {
								const nextValue = groupValue[0];
								if (!nextValue) return;
								deliverySheet.selectFulfillmentMethod(
									nextValue as FulfillmentMethod,
								);
							}}
							variant="outline"
							size="sm"
							className="shrink-0"
						>
							<ToggleGroupItem
								value={FulfillmentMethod.PICKUP}
								className="min-w-20"
							>
								Retiro en persona
							</ToggleGroupItem>
							<ToggleGroupItem
								value={FulfillmentMethod.DELIVERY}
								className="min-w-20"
							>
								Envío
							</ToggleGroupItem>
						</ToggleGroup>
					) : (
						<p className="text-sm font-medium text-neutral-700">
							Retiro en el local
						</p>
					)}
				</div>

				{deliverySheet.hasConfirmedDeliveryAddress &&
					fulfillmentMethod === FulfillmentMethod.DELIVERY &&
					addressSummary && (
						<button
							type="button"
							onClick={deliverySheet.open}
							className="mt-3 w-full text-left text-xs text-neutral-500 transition-colors hover:text-neutral-800"
						>
							<span className="font-semibold text-neutral-700">Dirección:</span>{" "}
							{addressSummary}
						</button>
					)}
			</div>

			<DeliveryAddressSheet
				open={supportsDelivery && deliverySheet.isOpen}
				draftDeliveryRequest={deliverySheet.draftDeliveryRequest}
				showError={shouldShowDeliveryError}
				onOpenChange={deliverySheet.handleOpenChange}
				onFieldChange={deliverySheet.updateDraftField}
				onConfirm={deliverySheet.confirm}
			/>
		</>
	);
}

type DeliveryAddressSheetProps = {
	open: boolean;
	draftDeliveryRequest: DeliveryRequestFormState;
	showError: boolean;
	onOpenChange: (open: boolean) => void;
	onFieldChange: (field: DeliveryRequestField, value: string) => void;
	onConfirm: () => void;
};

function DeliveryAddressSheet({
	open,
	draftDeliveryRequest,
	showError,
	onOpenChange,
	onFieldChange,
	onConfirm,
}: DeliveryAddressSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Dirección de entrega</SheetTitle>
					<SheetDescription>
						Completa los datos obligatorios para solicitar envío.
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-4 pb-4">
					{showError && (
						<div className="border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-red-600">
							Completa los datos de entrega requeridos antes de continuar.
						</div>
					)}

					<div className="grid gap-3 sm:grid-cols-2">
						<DeliveryInput
							label="Destinatario"
							value={draftDeliveryRequest.contactName}
							onChange={(value) => onFieldChange("contactName", value)}
						/>
						<DeliveryInput
							label="Teléfono"
							value={draftDeliveryRequest.contactPhone}
							onChange={(value) => onFieldChange("contactPhone", value)}
						/>
					</div>
					<DeliveryInput
						label="Dirección"
						value={draftDeliveryRequest.addressLine1}
						onChange={(value) => onFieldChange("addressLine1", value)}
					/>
					<DeliveryInput
						label="Dirección adicional"
						value={draftDeliveryRequest.addressLine2}
						onChange={(value) => onFieldChange("addressLine2", value)}
						required={false}
					/>
					<div className="grid gap-3 sm:grid-cols-2">
						<DeliveryInput
							label="Ciudad"
							value={draftDeliveryRequest.city}
							onChange={(value) => onFieldChange("city", value)}
						/>
						<DeliveryInput
							label="Provincia / región"
							value={draftDeliveryRequest.state}
							onChange={(value) => onFieldChange("state", value)}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<DeliveryInput
							label="Código postal"
							value={draftDeliveryRequest.postalCode}
							onChange={(value) => onFieldChange("postalCode", value)}
						/>
						<DeliveryInput
							label="País"
							value={draftDeliveryRequest.country}
							onChange={(value) => onFieldChange("country", value)}
						/>
					</div>
					<div className="space-y-1.5">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
							Instrucciones adicionales
						</p>
						<Textarea
							value={draftDeliveryRequest.notes}
							onChange={(event) => onFieldChange("notes", event.target.value)}
							placeholder="Ej: llamar antes de llegar, ingresar por portón lateral"
							className="min-h-24 rounded-none border-neutral-300 bg-white"
						/>
					</div>
				</div>

				<SheetFooter className="border-t border-neutral-200 bg-white">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="rounded-none"
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						className="rounded-none bg-black text-white hover:bg-neutral-800"
					>
						Confirmar dirección
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function DeliveryInfoPopover() {
	return (
		<Popover>
			<PopoverTrigger
				render={
					<button
						type="button"
						aria-label="Más información sobre el costo del envío"
						className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-600"
					>
						<CircleHelp className="h-4 w-4" />
					</button>
				}
			/>
			<PopoverContent
				align="start"
				sideOffset={10}
				className="w-72 gap-2 border border-neutral-200 bg-neutral-900"
			>
				<PopoverHeader className="gap-2">
					<PopoverTitle className="text-sm text-neutral-50">
						Entrega
					</PopoverTitle>
					<PopoverDescription className="space-y-3 text-xs leading-5 text-neutral-200">
						{/* TODO: Move tenant-specific delivery instructions and estimated fee copy to public tenant config. */}
						<p>
							Te gestionamos el permiso para que ingreses con tu coche a Madrid
							Central.
						</p>
						<p>
							El costo de envío se confirma según la dirección indicada. La
							tarifa estimada suele estar entre 30 y 45 euros, dependiendo de la
							zona de entrega.
						</p>
					</PopoverDescription>
				</PopoverHeader>
			</PopoverContent>
		</Popover>
	);
}

function DeliveryInput({
	label,
	value,
	onChange,
	required = true,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
}) {
	return (
		<div className="space-y-1.5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
				{label}
				{required ? " *" : ""}
			</p>
			<Input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="rounded-none border-neutral-300 bg-white"
			/>
		</div>
	);
}
