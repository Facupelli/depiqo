import type { CartDiscountLineItem, TenantPricingConfig } from "@repo/schemas";
import { FulfillmentMethod } from "@repo/types";
import {
	AlertTriangle,
	ArrowRight,
	Banknote,
	Check,
	CircleHelp,
	TicketPercent,
	MapPin,
	Tag,
	X,
} from "lucide-react";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PRDOUCT_TYPE_DICT } from "@/features/catalog/catalog.constants";
import type {
	DeliveryRequestField,
	DeliveryRequestFormState,
	JoinedLineItem,
} from "@/features/rental/cart/cart-order.types";
import { cn } from "@/lib/utils";
import { useIsVisible } from "@/shared/hooks/use-is-visible";
import { formatCurrency } from "@/shared/utils/price.utils";
import { getBookingSubmitButtonLabel } from "@/features/rental/checkout/booking-mode-copy";
import { useTenantRentalConfig } from "../../tenant/tenant.queries";
import { computeOriginalSubtotal, formatDiscount } from "../cart.utils";
import {
	isDeliveryRequestComplete,
	normalizeDeliveryRequest,
} from "../cart-order.utils";
import {
	useCartBookingContext,
	useCartContext,
	useCartDeliveryContext,
	useCartPricingContext,
} from "../cart-page.context";

const CART_MONEY_FRACTION_DIGITS = 2;

export function CartPageSidebar() {
	const { data: tenantRentalConfig } = useTenantRentalConfig();
	const tenantPriceConfig = tenantRentalConfig.pricing;
	const { cartItems } = useCartContext();
	const {
		breakdown,
		joinedLineItems,
		insuranceSelected,
		couponCode,
		isPriceLoading,
		isPriceError,
		onCouponCodeChange,
		onInsuranceSelectedChange,
	} = useCartPricingContext();
	const {
		supportsDelivery,
		fulfillmentMethod,
		deliveryRequest,
		isDeliveryDetailsRequired,
		onFulfillmentMethodChange,
		onDeliveryRequestFieldChange,
	} = useCartDeliveryContext();
	const { isAuthenticated, isBookingError, bookingErrorMessage, handleBook } =
		useCartBookingContext();

	const isDisabled = cartItems.length === 0 || isPriceLoading || isPriceError;
	const ctaLabel = getBookingSubmitButtonLabel({
		bookingMode: tenantRentalConfig.bookingMode,
		isAuthenticated,
	});

	const [bookButtonRef, isBookButtonVisible] =
		useIsVisible<HTMLButtonElement>();

	return (
		<>
			{/* ── Desktop/tablet sidebar — sticky only on lg+ ── */}
			<div className="border border-neutral-200 bg-white p-6 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
				<CartPagePriceBreakdown
					insuranceAmount={breakdown?.insuranceAmount}
					insuranceApplied={breakdown?.insuranceApplied}
					insuranceSelected={insuranceSelected}
					itemsSubtotal={breakdown?.itemsSubtotal}
					onInsuranceSelectedChange={onInsuranceSelectedChange}
					couponCode={couponCode}
					onCouponCodeChange={onCouponCodeChange}
					couponApplied={breakdown?.couponApplied ?? false}
					total={breakdown?.total}
					totalBeforeDiscounts={breakdown?.totalBeforeDiscounts}
					totalDiscount={breakdown?.totalDiscount}
					lineItems={joinedLineItems}
					isLoading={isPriceLoading}
					isError={isPriceError}
					priceConfig={tenantPriceConfig}
				/>

				<CartPageFulfillmentForm
					supportsDelivery={supportsDelivery}
					fulfillmentMethod={fulfillmentMethod}
					deliveryRequest={deliveryRequest}
					isDeliveryDetailsRequired={isDeliveryDetailsRequired}
					onFulfillmentMethodChange={onFulfillmentMethodChange}
					onDeliveryRequestFieldChange={onDeliveryRequestFieldChange}
				/>

				{isBookingError && (
					<div className="mt-6 flex items-start gap-3 border border-red-100 bg-red-50 px-4 py-3">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
						<p className="text-xs font-semibold uppercase tracking-wider text-red-600">
							{bookingErrorMessage}
						</p>
					</div>
				)}

				<Button
					ref={bookButtonRef}
					onClick={handleBook}
					disabled={isDisabled}
					className="mt-4 flex w-full items-center justify-center gap-2 rounded-none bg-black py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-300"
				>
					{ctaLabel}
					<ArrowRight className="h-3.5 w-3.5" />
				</Button>

				<div className="mt-4 space-y-2">
					{!isAuthenticated && (
						<div className="flex items-start gap-3 bg-neutral-50 px-3 py-2.5">
							<CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
							<p className="text-[11px] text-neutral-500">
								Puedes revisar tu pedido sin cuenta. Te pediremos iniciar sesión
								antes de completar la reserva.
							</p>
						</div>
					)}
					<div className="flex items-start gap-3 bg-neutral-50 px-3 py-2.5">
						<Banknote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
						<p className="text-[11px] text-neutral-500">
							El pago se cobra al retirar los equipos.
						</p>
					</div>
				</div>
			</div>

			{/* ── Floating CTA bar — mobile only, hides when real button is visible ── */}
			<div
				className={cn(
					"lg:hidden fixed bottom-0 left-0 right-0 z-20",
					"border-t border-neutral-200 bg-white px-4 py-3",
					"flex items-center justify-between gap-4",
					"transition-transform duration-200",
					isBookButtonVisible ? "translate-y-full" : "translate-y-0",
				)}
			>
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
						Total a pagar
					</p>
					{isPriceLoading ? (
						<Skeleton className="mt-1 h-5 w-24" />
					) : (
						<p className="text-lg font-black text-black">
							{breakdown?.total != null
								? formatCurrency(
										breakdown.total,
										tenantPriceConfig.currency,
										tenantPriceConfig.locale,
										CART_MONEY_FRACTION_DIGITS,
									)
								: "—"}
						</p>
					)}
				</div>
				<Button
					onClick={handleBook}
					disabled={isDisabled}
					className="flex items-center gap-2 rounded-none bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-300"
				>
					{ctaLabel}
					<ArrowRight className="h-3.5 w-3.5" />
				</Button>
			</div>
		</>
	);
}

type CartPageFulfillmentFormProps = {
	supportsDelivery: boolean;
	fulfillmentMethod: FulfillmentMethod;
	deliveryRequest: DeliveryRequestFormState;
	isDeliveryDetailsRequired: boolean;
	onFulfillmentMethodChange: (value: FulfillmentMethod) => void;
	onDeliveryRequestFieldChange: (
		field: DeliveryRequestField,
		value: string,
	) => void;
};

function CartPageFulfillmentForm({
	supportsDelivery,
	fulfillmentMethod,
	deliveryRequest,
	isDeliveryDetailsRequired,
	onFulfillmentMethodChange,
	onDeliveryRequestFieldChange,
}: CartPageFulfillmentFormProps) {
	const [isDeliverySheetOpen, setIsDeliverySheetOpen] = useState(false);
	const [draftDeliveryRequest, setDraftDeliveryRequest] =
		useState<DeliveryRequestFormState>(deliveryRequest);
	const [showDraftDeliveryError, setShowDraftDeliveryError] = useState(false);

	const confirmedDeliveryRequest = normalizeDeliveryRequest({
		deliveryRequest,
		fulfillmentMethod: FulfillmentMethod.DELIVERY,
	});
	const hasConfirmedDeliveryAddress = isDeliveryRequestComplete(
		confirmedDeliveryRequest,
	);
	const addressSummary = hasConfirmedDeliveryAddress
		? formatDeliveryAddressSummary(deliveryRequest)
		: null;
	const shouldShowDeliveryError =
		isDeliveryDetailsRequired || showDraftDeliveryError;

	const openDeliverySheet = () => {
		setDraftDeliveryRequest(deliveryRequest);
		setShowDraftDeliveryError(false);
		setIsDeliverySheetOpen(true);
	};

	const closeDeliverySheet = () => {
		setDraftDeliveryRequest(deliveryRequest);
		setShowDraftDeliveryError(false);
		setIsDeliverySheetOpen(false);
	};

	const handleSheetOpenChange = (open: boolean) => {
		if (!supportsDelivery) {
			closeDeliverySheet();
			return;
		}

		if (open) {
			openDeliverySheet();
			return;
		}

		closeDeliverySheet();

		if (!hasConfirmedDeliveryAddress) {
			onFulfillmentMethodChange(FulfillmentMethod.PICKUP);
		}
	};

	const handleFulfillmentMethodSelect = (value: FulfillmentMethod) => {
		if (value === FulfillmentMethod.PICKUP) {
			closeDeliverySheet();
			onFulfillmentMethodChange(FulfillmentMethod.PICKUP);
			return;
		}

		onFulfillmentMethodChange(FulfillmentMethod.DELIVERY);
		openDeliverySheet();
	};

	const handleDraftDeliveryFieldChange = (
		field: DeliveryRequestField,
		value: string,
	) => {
		setDraftDeliveryRequest((current) => ({ ...current, [field]: value }));
		setShowDraftDeliveryError(false);
	};

	const handleConfirmDelivery = () => {
		const normalizedDraftDeliveryRequest = normalizeDeliveryRequest({
			deliveryRequest: draftDeliveryRequest,
			fulfillmentMethod: FulfillmentMethod.DELIVERY,
		});

		if (!isDeliveryRequestComplete(normalizedDraftDeliveryRequest)) {
			setShowDraftDeliveryError(true);
			return;
		}

		for (const [field, value] of Object.entries(draftDeliveryRequest)) {
			onDeliveryRequestFieldChange(field as DeliveryRequestField, value);
		}

		setShowDraftDeliveryError(false);
		setIsDeliverySheetOpen(false);
	};

	return (
		<>
			<div className="mt-6 border-t border-neutral-200 pt-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex min-w-0 items-center gap-2">
						<MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
						<span className="text-[15px] font-medium text-neutral-700">
							Entrega
						</span>
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
										<p>
											Te gestionamos el permiso para que ingreses con tu coche a
											Madrid Central.
										</p>
										<p>
											El costo de envío se confirma según la dirección indicada.
											La tarifa estimada suele estar entre 30 y 45 euros,
											dependiendo de la zona de entrega.
										</p>
									</PopoverDescription>
								</PopoverHeader>
							</PopoverContent>
						</Popover>
					</div>

					{supportsDelivery ? (
						<ToggleGroup
							value={[fulfillmentMethod]}
							onValueChange={(groupValue) => {
								const nextValue = groupValue[0];
								if (!nextValue) {
									return;
								}

								handleFulfillmentMethodSelect(nextValue as FulfillmentMethod);
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

				{hasConfirmedDeliveryAddress &&
					fulfillmentMethod === FulfillmentMethod.DELIVERY &&
					addressSummary && (
						<button
							type="button"
							onClick={openDeliverySheet}
							className="mt-3 w-full text-left text-xs text-neutral-500 transition-colors hover:text-neutral-800"
						>
							<span className="font-semibold text-neutral-700">Dirección:</span>{" "}
							{addressSummary}
						</button>
					)}
			</div>

			<Sheet
				open={supportsDelivery && isDeliverySheetOpen}
				onOpenChange={handleSheetOpenChange}
			>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-lg"
				>
					<SheetHeader>
						<SheetTitle>Dirección de entrega</SheetTitle>
						<SheetDescription>
							Completa los datos obligatorios para solicitar envío.
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-4 px-4 pb-4">
						{shouldShowDeliveryError && (
							<div className="border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-red-600">
								Completa los datos de entrega requeridos antes de continuar.
							</div>
						)}

						<div className="grid gap-3 sm:grid-cols-2">
							<DeliveryInput
								label="Destinatario"
								value={draftDeliveryRequest.recipientName}
								onChange={(value) =>
									handleDraftDeliveryFieldChange("recipientName", value)
								}
							/>
							<DeliveryInput
								label="Teléfono"
								value={draftDeliveryRequest.phone}
								onChange={(value) =>
									handleDraftDeliveryFieldChange("phone", value)
								}
							/>
						</div>

						<DeliveryInput
							label="Dirección"
							value={draftDeliveryRequest.addressLine1}
							onChange={(value) =>
								handleDraftDeliveryFieldChange("addressLine1", value)
							}
						/>

						<DeliveryInput
							label="Dirección adicional"
							value={draftDeliveryRequest.addressLine2}
							onChange={(value) =>
								handleDraftDeliveryFieldChange("addressLine2", value)
							}
							required={false}
						/>

						<div className="grid gap-3 sm:grid-cols-2">
							<DeliveryInput
								label="Ciudad"
								value={draftDeliveryRequest.city}
								onChange={(value) =>
									handleDraftDeliveryFieldChange("city", value)
								}
							/>
							<DeliveryInput
								label="Provincia / región"
								value={draftDeliveryRequest.stateRegion}
								onChange={(value) =>
									handleDraftDeliveryFieldChange("stateRegion", value)
								}
							/>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<DeliveryInput
								label="Código postal"
								value={draftDeliveryRequest.postalCode}
								onChange={(value) =>
									handleDraftDeliveryFieldChange("postalCode", value)
								}
							/>
							<DeliveryInput
								label="País"
								value={draftDeliveryRequest.country}
								onChange={(value) =>
									handleDraftDeliveryFieldChange("country", value)
								}
							/>
						</div>

						<div className="space-y-1.5">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
								Instrucciones adicionales
							</p>
							<Textarea
								value={draftDeliveryRequest.instructions}
								onChange={(event) =>
									handleDraftDeliveryFieldChange(
										"instructions",
										event.target.value,
									)
								}
								placeholder="Ej: llamar antes de llegar, ingresar por portón lateral"
								className="min-h-24 rounded-none border-neutral-300 bg-white"
							/>
						</div>
					</div>

					<SheetFooter className="border-t border-neutral-200 bg-white">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleSheetOpenChange(false)}
							className="rounded-none"
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={handleConfirmDelivery}
							className="rounded-none bg-black text-white hover:bg-neutral-800"
						>
							Confirmar dirección
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}

function formatDeliveryAddressSummary(
	deliveryRequest: DeliveryRequestFormState,
) {
	return [
		deliveryRequest.addressLine1.trim(),
		deliveryRequest.addressLine2.trim(),
		[
			deliveryRequest.city.trim(),
			deliveryRequest.stateRegion.trim(),
			deliveryRequest.postalCode.trim(),
		]
			.filter(Boolean)
			.join(", "),
		deliveryRequest.country.trim(),
	]
		.filter(Boolean)
		.join(" · ");
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

// ── CartPagePriceBreakdown ─────────────────────────────────────────────────────
// Orchestrator. Composes the line items, subtotal, discount deduction,
// total, and savings banner. Shows pre-discount subtotal only when relevant.

type CartPagePriceBreakdownProps = {
	insuranceAmount: number | undefined;
	insuranceApplied: boolean | undefined;
	insuranceSelected: boolean;
	itemsSubtotal: number | undefined;
	onInsuranceSelectedChange: (value: boolean) => void;
	couponCode: string;
	onCouponCodeChange: (value: string) => void;
	couponApplied: boolean;
	total: number | undefined;
	totalBeforeDiscounts: number | undefined;
	totalDiscount: number | undefined;
	lineItems: JoinedLineItem[] | undefined;
	isLoading: boolean;
	isError: boolean;
	priceConfig: TenantPricingConfig;
};

export function CartPagePriceBreakdown({
	insuranceAmount,
	insuranceApplied,
	insuranceSelected,
	itemsSubtotal,
	onInsuranceSelectedChange,
	couponCode,
	onCouponCodeChange,
	couponApplied,
	total,
	totalBeforeDiscounts,
	totalDiscount,
	lineItems,
	isLoading,
	isError,
	priceConfig,
}: CartPagePriceBreakdownProps) {
	const [draftCouponCode, setDraftCouponCode] = useState(couponCode);
	void couponApplied;

	if (isError) {
		return (
			<div className="flex items-start gap-3 border border-red-100 bg-red-50 px-4 py-3">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
				<p className="text-xs font-semibold uppercase tracking-wider text-red-600">
					No se puede calcular el precio. Por favor, inténtalo de nuevo.
				</p>
			</div>
		);
	}

	const hasSavings = (totalDiscount ?? 0) > 0;
	const shouldShowInsuranceToggle = priceConfig.insuranceEnabled;
	const shouldShowInsuranceRow = insuranceApplied === true;

	function handleApplyCoupon() {
		onCouponCodeChange(draftCouponCode.trim().toUpperCase());
	}

	function handleClearCoupon() {
		setDraftCouponCode("");
		onCouponCodeChange("");
	}

	void handleApplyCoupon;
	void handleClearCoupon;

	return (
		<div>
			<h3 className="mb-4 text-sm font-black uppercase tracking-widest text-black">
				Desglose de precio
			</h3>

			{/* Line items */}
			<div className="space-y-4">
				{isLoading
					? ["line-item-skeleton-1", "line-item-skeleton-2"].map((key) => (
							<div key={key} className="flex items-start justify-between gap-4">
								<Skeleton className="h-8 w-32" />
								<Skeleton className="h-5 w-16" />
							</div>
						))
					: lineItems?.map((item) => (
							<LineItemRow
								key={item.id}
								item={item}
								priceConfig={priceConfig}
							/>
						))}
			</div>

			{shouldShowInsuranceToggle ? (
				<>
					<div className="my-4 border-t border-neutral-200" />
					<InsuranceToggleRow
						checked={insuranceSelected}
						onCheckedChange={onInsuranceSelectedChange}
						ratePercent={priceConfig.insuranceRatePercent}
					/>
				</>
			) : null}

			{/* <div className="my-4 border-t border-neutral-200" />

      <CouponInputRow
        couponCode={draftCouponCode}
        onCouponCodeChange={setDraftCouponCode}
        onApply={handleApplyCoupon}
        onClear={handleClearCoupon}
        isLoading={isLoading}
        couponApplied={couponApplied}
      /> */}

			<div className="my-4 border-t border-neutral-200" />

			<BreakdownRow
				label="Subtotal antes de descuentos"
				value={totalBeforeDiscounts}
				isLoading={isLoading}
				priceConfig={priceConfig}
			/>

			{hasSavings && (
				<BreakdownRow
					label="Descuentos"
					value={totalDiscount}
					isLoading={isLoading}
					priceConfig={priceConfig}
					tone="success"
					prefix="−"
				/>
			)}

			<BreakdownRow
				label="Subtotal de equipos"
				value={itemsSubtotal}
				isLoading={isLoading}
				priceConfig={priceConfig}
			/>

			{shouldShowInsuranceRow && (
				<BreakdownRow
					label="Seguro de equipos"
					value={insuranceAmount}
					isLoading={isLoading}
					priceConfig={priceConfig}
				/>
			)}

			<div className="my-4 border-t border-neutral-200" />

			{/* Total */}
			<div className="flex items-center justify-between">
				<p className="text-sm font-black uppercase md:tracking-widest text-black">
					Total a pagar
				</p>
				{isLoading ? (
					<Skeleton className="h-7 w-28" />
				) : (
					<p className="text-xl font-black text-black">
						{total != null
							? formatCurrency(
									total,
									priceConfig.currency,
									priceConfig.locale,
									CART_MONEY_FRACTION_DIGITS,
								)
							: "—"}
					</p>
				)}
			</div>

			{/* Savings banner — only visible when savings exist */}
			{!isLoading && hasSavings && totalDiscount != null && (
				<div className="-mx-6 mt-4">
					<SavingsBanner
						totalDiscount={totalDiscount}
						priceConfig={priceConfig}
					/>
				</div>
			)}
		</div>
	);
}

type CouponInputRowProps = {
	couponCode: string;
	onCouponCodeChange: (value: string) => void;
	onApply: () => void;
	onClear: () => void;
	isLoading: boolean;
	couponApplied: boolean;
};

function CouponInputRow({
	couponCode,
	onCouponCodeChange,
	onApply,
	onClear,
	isLoading,
	couponApplied,
}: CouponInputRowProps) {
	const hasValue = couponCode.trim().length > 0;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<TicketPercent className="h-4 w-4 text-neutral-500" />
				<p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
					Cupón o código promocional
				</p>
			</div>

			<div className="flex gap-2">
				<Input
					value={couponCode}
					onChange={(event) =>
						onCouponCodeChange(event.target.value.toUpperCase())
					}
					placeholder="Ingresa tu cupón"
					className="rounded-none border-neutral-300 bg-white uppercase"
					disabled={isLoading}
				/>
				<Button
					type="button"
					variant="outline"
					className="rounded-none"
					onClick={onApply}
					disabled={!hasValue || isLoading}
				>
					Aplicar
				</Button>
				{hasValue && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="rounded-none"
						onClick={onClear}
						disabled={isLoading}
						aria-label="Quitar cupón"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			{hasValue && (
				<p className="flex items-center gap-2 text-xs text-neutral-500">
					{couponApplied ? (
						<>
							<Check className="h-3.5 w-3.5 text-green-600" />
							<span className="text-green-700">
								El cupón se está evaluando en el precio del carrito.
							</span>
						</>
					) : (
						<span>
							Aplica el cupón para validar descuentos y promociones en esta
							vista previa.
						</span>
					)}
				</p>
			)}
		</div>
	);
}

void CouponInputRow;

type InsuranceToggleRowProps = {
	checked: boolean;
	onCheckedChange: (value: boolean) => void;
	ratePercent: number;
};

function InsuranceToggleRow({
	checked,
	onCheckedChange,
	ratePercent,
}: InsuranceToggleRowProps) {
	return (
		<div className="flex items-center gap-4">
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				aria-label="Activar seguro de equipos"
			/>

			<div className="flex min-w-0 items-center gap-2">
				<span className="text-[15px] font-medium text-neutral-700">
					Seguro de equipos ({ratePercent}%)
				</span>

				<Popover>
					<PopoverTrigger
						render={
							<button
								type="button"
								aria-label="Más información sobre el seguro de equipos"
								className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-600"
							>
								<CircleHelp className="h-4 w-4" />
							</button>
						}
					/>
					<PopoverContent
						align="start"
						sideOffset={10}
						className="w-96 gap-3 border border-neutral-200 bg-neutral-900"
					>
						<PopoverHeader className="gap-2">
							<PopoverTitle className="text-sm text-neutral-50">
								Seguro de equipos
							</PopoverTitle>
							<PopoverDescription className="space-y-3 text-xs leading-5 text-neutral-200">
								<p>
									Protege tu pedido con una cobertura adicional ante imprevistos
									durante el alquiler. El cargo corresponde al {ratePercent}%
									del subtotal antes de descuentos y se suma al total final del
									pedido.
								</p>
								<p>
									El seguro NO incluye daños por el mal uso del equipo por parte
									del cliente, esto implica situaciones como rotura del puerto
									para tarjetas de la cámara, exposición del sensor a lásers,
									roturas por montar incorrectamente el equipo, etc. También
									quedan excluidos de la cobertura las averías o daños debidos a
									uso, impericia, negligencia, daños eléctricos y magnéticos,
									rozaduras y/o arañazos, daños al software, defectos latentes,
									hurto, estafa, perdida, apropiación indebida y daños por
									contaminación.
								</p>
								<p>
									Los equipos están asegurados durante los rodajes contra
									accidente consecuencia de accidentes del vehículo porteador.
									Durante las estancias (montaje y rodaje) en el seguro está
									previsto el robo, incendio, roturas, daños por agua.
								</p>
							</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

type BreakdownRowProps = {
	label: string;
	value: number | undefined;
	isLoading: boolean;
	priceConfig: TenantPricingConfig;
	tone?: "default" | "success";
	prefix?: string;
};

function BreakdownRow({
	label,
	value,
	isLoading,
	priceConfig,
	tone = "default",
	prefix,
}: BreakdownRowProps) {
	const textColor = tone === "success" ? "text-green-700" : "text-neutral-500";
	const valueColor =
		tone === "success"
			? "text-green-700 font-semibold"
			: "text-black font-medium";

	return (
		<div className="mt-2 flex items-center justify-between first:mt-0">
			<p className={cn("text-sm", textColor)}>{label}</p>
			{isLoading ? (
				<Skeleton className="h-5 w-20" />
			) : (
				<p className={cn("text-sm", valueColor)}>
					{value != null
						? `${prefix ?? ""}${formatCurrency(
								value,
								priceConfig.currency,
								priceConfig.locale,
								CART_MONEY_FRACTION_DIGITS,
							)}`
						: "—"}
				</p>
			)}
		</div>
	);
}

type DiscountTagProps = {
	discount: CartDiscountLineItem;
	priceConfig: TenantPricingConfig;
};

function DiscountTag({ discount, priceConfig }: DiscountTagProps) {
	const label = discount.label;
	const sourceId = discount.sourceId;

	return (
		<div
			className="inline-flex items-center gap-1.5 border-l-2 border-green-500 bg-green-50 px-2.5 py-1"
			data-source-id={sourceId}
		>
			<Tag className="h-2.5 w-2.5 shrink-0 text-green-600" />

			<span className="text-[10px] font-semibold uppercase tracking-wider text-green-700">
				{label}
			</span>
			<span className="text-[10px] font-black text-green-700">
				{formatDiscount(discount, priceConfig.currency, priceConfig.locale)}
			</span>
		</div>
	);
}

// ── LineItemRow ────────────────────────────────────────────────────────────────
// Renders one cart line item with its name, type badge, discount tags,
// and price — showing a strikethrough original when discounts apply.

type LineItemRowProps = {
	item: JoinedLineItem;
	priceConfig: TenantPricingConfig;
};

function LineItemRow({ item, priceConfig }: LineItemRowProps) {
	const hasDiscounts = item.discounts.length > 0;
	const originalSubtotal = hasDiscounts ? computeOriginalSubtotal(item) : null;

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex flex-col gap-1">
				<p className="text-sm text-black">{item.name}</p>
				<p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
					{PRDOUCT_TYPE_DICT[item.type]}
				</p>
				{hasDiscounts && (
					<div className="mt-1 flex flex-wrap gap-1">
						{item.discounts.map((discount) => (
							<DiscountTag
								key={discount.sourceId}
								discount={discount}
								priceConfig={priceConfig}
							/>
						))}
					</div>
				)}
			</div>

			<div className="flex shrink-0 flex-col items-end gap-0.5">
				{originalSubtotal != null && (
					<span className="text-xs text-neutral-400 line-through">
						{formatCurrency(
							originalSubtotal,
							priceConfig.currency,
							priceConfig.locale,
							CART_MONEY_FRACTION_DIGITS,
						)}
					</span>
				)}
				<span className="text-sm font-semibold text-black">
					{formatCurrency(
						item.subtotal,
						priceConfig.currency,
						priceConfig.locale,
						CART_MONEY_FRACTION_DIGITS,
					)}
				</span>
			</div>
		</div>
	);
}

// ── SavingsBanner ──────────────────────────────────────────────────────────────
// Full-width row shown only when there are active discounts.
// Stark and typography-forward — no bubble, no emoji — matches the system tone.

type SavingsBannerProps = {
	totalDiscount: number;
	priceConfig: TenantPricingConfig;
};

function SavingsBanner({ totalDiscount, priceConfig }: SavingsBannerProps) {
	return (
		<div className="flex items-center justify-between border-t-2 border-green-500 bg-green-50 px-4 py-2.5">
			<p className="text-[10px] font-semibold uppercase tracking-widest text-green-700">
				Ahorraste en este pedido
			</p>
			<p className="text-sm font-black text-green-700">
				{formatCurrency(
					totalDiscount,
					priceConfig.currency,
					priceConfig.locale,
					CART_MONEY_FRACTION_DIGITS,
				)}
			</p>
		</div>
	);
}
