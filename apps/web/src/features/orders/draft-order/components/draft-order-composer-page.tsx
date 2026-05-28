import type {
	CustomerResponseDto,
	OrderItemsUnavailableProblemDto,
	OrderPricingPreviewRequestDto,
	OrderPricingPreviewResponseDto,
} from "@repo/schemas";
import { FulfillmentMethod } from "@repo/types";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Search, UserRound, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/features/customer/customer.queries";
import { OrderAvailabilityConflictFeedback } from "@/features/orders/components/order-availability-conflict-feedback";
import { DraftOrderItemPicker } from "@/features/orders/draft-order/components/draft-order-item-picker";
import {
	useDraftOrderActions,
	useDraftOrderCustomer,
	useDraftOrderFulfillment,
	useDraftOrderItems,
	useDraftOrderPricing,
	useDraftOrderRentalPeriod,
} from "@/features/orders/draft-order/draft-order.context";
import {
	isValidNonNegativeMoneyAmount,
	normalizeMoneyAmount,
} from "@/features/orders/draft-order/utils/draft-order-pricing";
import { formatMoney } from "@/features/orders/order.utils";
import type { OrderAvailabilityConflictDisplayModel } from "@/features/orders/order-availability-conflict.display-model";
import { useSaveOrderEditor } from "@/features/orders/order-editor/hooks/use-save-order-editor";
import type { OrderEditorMode } from "@/features/orders/order-editor/types/order-editor.types";
import { getOrderEditorCopy } from "@/features/orders/order-editor/utils/order-editor-copy";
import { useOrderPricingPreview } from "@/features/orders/orders.queries";
import { useCurrentTenant } from "@/features/tenant/tenant.queries";
import dayjs from "@/lib/dates/dayjs";
import { dateParamToLocalDate, localDateToDateParam } from "@/lib/dates/parse";
import { useLocationId } from "@/shared/contexts/location/location.hooks";
import useDebounce from "@/shared/hooks/use-debounce";

const EMPTY_PRICING_PREVIEW_PRODUCT_ID = "00000000-0000-0000-0000-000000000000";

export function DraftOrderComposerPage({
	mode = "edit-draft",
	orderId,
	buildConflictDisplayModel,
}: {
	mode?: OrderEditorMode;
	orderId?: string;
	buildConflictDisplayModel?: (
		conflict: OrderItemsUnavailableProblemDto,
	) => OrderAvailabilityConflictDisplayModel | null;
}) {
	const pricingPreview = useDraftOrderPricingPreview();

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_380px]">
			<div className="space-y-4">
				<OrderEditorImpactBanner mode={mode} />
				<DraftSetupSection mode={mode} />
				<ItemsSection mode={mode} pricingPreview={pricingPreview} />
			</div>

			<div className="xl:sticky xl:top-6 xl:self-start">
				<DraftSidebarSection
					mode={mode}
					orderId={orderId}
					buildConflictDisplayModel={buildConflictDisplayModel}
					pricingPreview={pricingPreview}
				/>
			</div>
		</div>
	);
}

type DraftOrderPricingPreviewState = {
	data: OrderPricingPreviewResponseDto | undefined;
	isFetching: boolean;
	isError: boolean;
	isReady: boolean;
};

function useDraftOrderPricingPreview(): DraftOrderPricingPreviewState {
	const locationId = useLocationId();
	const { data: tenant } = useCurrentTenant();
	const { customer } = useDraftOrderCustomer();
	const { rentalPeriod } = useDraftOrderRentalPeriod();
	const { fulfillmentMethod } = useDraftOrderFulfillment();
	const { items } = useDraftOrderItems();
	const { currency, budget } = useDraftOrderPricing();
	const previewCurrency = tenant?.config.pricing.currency ?? currency;
	const isReady = Boolean(
		locationId &&
			rentalPeriod.pickupDate &&
			rentalPeriod.returnDate &&
			rentalPeriod.pickupTime !== null &&
			rentalPeriod.returnTime !== null &&
			items.length > 0,
	);
	const request: OrderPricingPreviewRequestDto = {
		customerId: customer?.id ?? null,
		locationId: locationId ?? EMPTY_PRICING_PREVIEW_PRODUCT_ID,
		pickupDate: rentalPeriod.pickupDate ?? "1970-01-01",
		returnDate: rentalPeriod.returnDate ?? "1970-01-01",
		pickupTime: rentalPeriod.pickupTime ?? 0,
		returnTime: rentalPeriod.returnTime ?? 0,
		currency: previewCurrency,
		insuranceSelected: false,
		fulfillmentMethod,
		deliveryRequest: null,
		items:
			items.length > 0
				? items.map((item) => ({
						draftItemId: item.draftItemId,
						label: item.selection.label,
						...(item.selection.type === "PRODUCT"
							? {
									type: "PRODUCT" as const,
									productTypeId: item.selection.productTypeId,
									assetId: item.selection.assetId,
									quantity: item.selection.quantity,
								}
							: {
									type: "BUNDLE" as const,
									bundleId: item.selection.bundleId,
								}),
					}))
				: [
						{
							draftItemId: "empty",
							label: "Empty",
							type: "PRODUCT",
							productTypeId: EMPTY_PRICING_PREVIEW_PRODUCT_ID,
							quantity: 1,
						},
					],
		pricingAdjustment: budget
			? {
					mode: "TARGET_TOTAL",
					targetTotal: budget.targetTotal,
				}
			: null,
	};
	const { data, isFetching, isError } = useOrderPricingPreview(request, {
		enabled: isReady,
	});

	return { data, isFetching, isError, isReady };
}

function OrderEditorImpactBanner({ mode }: { mode: OrderEditorMode }) {
	const copy = getOrderEditorCopy(mode);

	if (!copy.impactTitle || !copy.impactDescription) {
		return null;
	}

	return (
		<Card className="border-amber-200 bg-amber-50/60">
			<CardHeader>
				<CardTitle className="text-amber-950">{copy.impactTitle}</CardTitle>
				<CardDescription className="text-amber-800">
					{copy.impactDescription}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}

function DraftSetupSection({ mode }: { mode: OrderEditorMode }) {
	const copy = getOrderEditorCopy(mode);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{copy.setupTitle}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<CustomerLinkSection mode={mode} />
				<RentalPeriodSection />
				<FulfillmentSection mode={mode} />
			</CardContent>
		</Card>
	);
}

function CustomerLinkSection({ mode }: { mode: OrderEditorMode }) {
	const copy = getOrderEditorCopy(mode);
	const { customer, setCustomer, clearCustomer } = useDraftOrderCustomer();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const normalizedSearch = debouncedSearch.trim();
	const shouldSearchCustomers = normalizedSearch.length > 0;
	const { data, isFetching, isError } = useCustomers(
		{
			page: 1,
			limit: 5,
			search: shouldSearchCustomers ? normalizedSearch : null,
			onboardingStatus: null,
			isActive: null,
			isCompany: null,
		},
		{
			enabled: shouldSearchCustomers,
		},
	);
	const customerResults = data?.data ?? [];

	function renderCustomerResults() {
		if (!shouldSearchCustomers) {
			return null;
		}

		if (isError) {
			return (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					No pudimos buscar clientes en este momento.
				</div>
			);
		}

		if (customerResults.length === 0) {
			return (
				<div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
					No se encontraron clientes para &quot;{normalizedSearch}&quot;.
				</div>
			);
		}

		return (
			<div className="space-y-2 rounded-lg border border-border bg-background p-2">
				{customerResults.map((result) => (
					<CustomerSearchResultRow
						key={result.id}
						customer={result}
						onSelect={() => {
							setCustomer({
								id: result.id,
								displayName: getCustomerDisplayName(result),
							});
							setSearch("");
						}}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1 flex items-center gap-2">
					<h2 className="text-base font-semibold">Cliente</h2>
					{copy.setupCustomerOptionalLabel ? (
						<p className="text-xs text-muted-foreground">
							{copy.setupCustomerOptionalLabel}
						</p>
					) : null}
				</div>
				<div className="flex flex-wrap gap-2">
					{customer ? (
						<Button type="button" variant="ghost" onClick={clearCustomer}>
							Limpiar cliente
						</Button>
					) : null}
				</div>
			</div>

			<div className="space-y-2">
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					{isFetching ? (
						<Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
					) : null}
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Buscar cliente por nombre, empresa o email"
						className="pl-9"
					/>
				</div>

				{renderCustomerResults()}
			</div>

			{customer ? (
				<div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
					<div className="min-w-0 space-y-1">
						<p className="font-medium">{customer.displayName}</p>
						<p className="text-sm text-muted-foreground break-all">
							{customer.id}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={clearCustomer}
					>
						<X className="size-4" />
						Quitar
					</Button>
				</div>
			) : (
				<div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
					<UserRound className="size-4 shrink-0" />
					<span>Sin cliente vinculado.</span>
				</div>
			)}
		</div>
	);
}

function RentalPeriodSection() {
	const { rentalPeriod, setRentalPeriodField, clearRentalPeriod } =
		useDraftOrderRentalPeriod();

	return (
		<div className="space-y-4 border-t pt-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-base font-semibold">Período de alquiler</h2>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="ghost" onClick={clearRentalPeriod}>
						Limpiar período
					</Button>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px] md:items-end">
				<RentalPeriodDateRangeField
					pickupDate={rentalPeriod.pickupDate}
					returnDate={rentalPeriod.returnDate}
					onChange={(range) => {
						setRentalPeriodField(
							"pickupDate",
							range?.from ? localDateToDateParam(range.from) : null,
						);
						setRentalPeriodField(
							"returnDate",
							range?.to ? localDateToDateParam(range.to) : null,
						);
					}}
				/>
				<PeriodField
					label="Hora de retiro"
					value={minutesToTimeInput(rentalPeriod.pickupTime)}
					onChange={(value) =>
						setRentalPeriodField("pickupTime", timeInputToMinutes(value))
					}
				/>
				<PeriodField
					label="Hora de devolución"
					value={minutesToTimeInput(rentalPeriod.returnTime)}
					onChange={(value) =>
						setRentalPeriodField("returnTime", timeInputToMinutes(value))
					}
				/>
			</div>
		</div>
	);
}

function FulfillmentSection({ mode }: { mode: OrderEditorMode }) {
	const copy = getOrderEditorCopy(mode);
	const {
		fulfillmentMethod,
		deliveryRequest,
		setFulfillmentMethod,
		setDeliveryRequestField,
	} = useDraftOrderFulfillment();

	return (
		<div className="space-y-4 border-t pt-4">
			<div className="space-y-1">
				<h2 className="text-base font-semibold">Logística</h2>
				<p className="text-sm text-muted-foreground">
					{copy.logisticsDescription}
				</p>
			</div>

			<RadioGroup
				value={fulfillmentMethod}
				onValueChange={(value) =>
					setFulfillmentMethod(value as FulfillmentMethod)
				}
				className="grid gap-3 md:grid-cols-2"
			>
				<FulfillmentMethodOption
					value={FulfillmentMethod.PICKUP}
					label="Retiro"
					description="No incluye una solicitud de entrega en los datos locales."
				/>
				<FulfillmentMethodOption
					value={FulfillmentMethod.DELIVERY}
					label="Entrega"
					description="Solicita dirección y datos del destinatario."
				/>
			</RadioGroup>

			{fulfillmentMethod === FulfillmentMethod.DELIVERY && (
				<div className="grid gap-3 md:grid-cols-2">
					<DeliveryField
						label="Nombre del destinatario"
						value={deliveryRequest?.recipientName ?? ""}
						onChange={(value) =>
							setDeliveryRequestField("recipientName", value)
						}
					/>
					<DeliveryField
						label="Teléfono"
						value={deliveryRequest?.phone ?? ""}
						onChange={(value) => setDeliveryRequestField("phone", value)}
					/>
					<DeliveryField
						label="Dirección línea 1"
						value={deliveryRequest?.addressLine1 ?? ""}
						onChange={(value) => setDeliveryRequestField("addressLine1", value)}
					/>
					<DeliveryField
						label="Dirección línea 2"
						value={deliveryRequest?.addressLine2 ?? ""}
						onChange={(value) => setDeliveryRequestField("addressLine2", value)}
					/>
					<DeliveryField
						label="Ciudad"
						value={deliveryRequest?.city ?? ""}
						onChange={(value) => setDeliveryRequestField("city", value)}
					/>
					<DeliveryField
						label="Provincia / región"
						value={deliveryRequest?.stateRegion ?? ""}
						onChange={(value) => setDeliveryRequestField("stateRegion", value)}
					/>
					<DeliveryField
						label="Código postal"
						value={deliveryRequest?.postalCode ?? ""}
						onChange={(value) => setDeliveryRequestField("postalCode", value)}
					/>
					<DeliveryField
						label="País"
						value={deliveryRequest?.country ?? ""}
						onChange={(value) => setDeliveryRequestField("country", value)}
					/>
					<div className="space-y-2 md:col-span-2">
						<p className="text-sm font-medium">Indicaciones</p>
						<Textarea
							value={deliveryRequest?.instructions ?? ""}
							onChange={(event) =>
								setDeliveryRequestField("instructions", event.target.value)
							}
							placeholder="Indicaciones opcionales para la entrega"
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function ItemsSection({
	mode,
	pricingPreview,
}: {
	mode: OrderEditorMode;
	pricingPreview: DraftOrderPricingPreviewState;
}) {
	const copy = getOrderEditorCopy(mode);
	const { items, removeItem, setProductQuantity } = useDraftOrderItems();
	const pricingByItemId = Object.fromEntries(
		(pricingPreview.data?.lineItems ?? []).map((line) => [
			line.draftItemId,
			line,
		]),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ítems</CardTitle>
				<CardDescription>
					{copy.itemsDescription}
					{pricingPreview.isFetching ? " Recalculando precios..." : ""}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<DraftOrderItemPicker mode={mode} />

				{pricingPreview.isError ? (
					<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						No pudimos recalcular los precios con el período e ítems actuales.
					</div>
				) : null}

				{items.length === 0 ? (
					<div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
						{copy.emptyItemsText}
					</div>
				) : (
					<div className="rounded-lg border border-border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Ítem</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead>Cantidad</TableHead>
									<TableHead>Precio</TableHead>
									<TableHead>Presupuesto</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item) => {
									const pricing = pricingByItemId[item.draftItemId];

									return (
										<TableRow key={item.draftItemId}>
											<TableCell>
												<div className="space-y-1">
													<p className="font-medium">{item.selection.label}</p>
													<p className="text-xs text-muted-foreground">
														{pricing?.hasAdjustment
															? "Vista previa proporcional"
															: "Precio calculado"}
													</p>
												</div>
											</TableCell>
											<TableCell>
												{item.selection.type === "PRODUCT"
													? "Producto"
													: "Combo"}
											</TableCell>
											<TableCell>
												{item.selection.type === "PRODUCT" ? (
													<Input
														type="number"
														min={1}
														value={item.selection.quantity}
														onChange={(event) => {
															const quantity = Number(event.target.value);
															if (Number.isFinite(quantity) && quantity > 0) {
																setProductQuantity(
																	item.draftItemId,
																	Math.trunc(quantity),
																);
															}
														}}
														className="w-20"
													/>
												) : (
													"-"
												)}
											</TableCell>
											<TableCell>
												<ItemPricingSummary pricing={pricing} />
											</TableCell>
											<TableCell>
												<ItemBudgetPreview pricing={pricing} />
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													variant="ghost"
													onClick={() => removeItem(item.draftItemId)}
												>
													Quitar
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function DraftSidebarSection({
	mode,
	orderId,
	buildConflictDisplayModel,
	pricingPreview,
}: {
	mode: OrderEditorMode;
	orderId?: string;
	buildConflictDisplayModel?: (
		conflict: OrderItemsUnavailableProblemDto,
	) => OrderAvailabilityConflictDisplayModel | null;
	pricingPreview: DraftOrderPricingPreviewState;
}) {
	const copy = getOrderEditorCopy(mode);
	const { isReadyForSave, itemCount, resetDraft } = useDraftOrderActions();
	const { customer } = useDraftOrderCustomer();
	const { rentalPeriod } = useDraftOrderRentalPeriod();
	const { fulfillmentMethod } = useDraftOrderFulfillment();
	const { currency, budget, setBudgetTargetTotal } = useDraftOrderPricing();
	const preview = pricingPreview.data;
	const previewCurrency = preview?.currency ?? currency;
	const { handleSaveOrderEditor, saveConflict, saveError, isSaving } =
		useSaveOrderEditor(orderId, mode);
	const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
	const saveConflictModel =
		saveConflict && buildConflictDisplayModel
			? buildConflictDisplayModel(saveConflict)
			: null;

	function handlePrimarySaveClick() {
		if (mode === "edit-confirmed") {
			setIsConfirmSaveOpen(true);
			return;
		}

		void handleSaveOrderEditor();
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{copy.sidebarTitle}</CardTitle>
				<CardDescription>{copy.sidebarDescription}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
					<SummaryRow
						label="Subtotal calculado"
						value={formatMoney(
							preview?.calculatedSubtotal ?? "0.00",
							previewCurrency,
						)}
					/>
					<SummaryRow
						label="Total presupuesto"
						value={formatMoney(
							preview?.effectiveSubtotal ?? "0.00",
							previewCurrency,
						)}
					/>
					<SummaryRow
						label="Objetivo"
						value={formatMoney(
							preview?.targetTotal ?? preview?.calculatedSubtotal ?? "0.00",
							previewCurrency,
						)}
					/>
					<SummaryRow
						label="Ajuste"
						value={formatSignedMoney(
							preview?.adjustmentTotal ?? "0.00",
							preview?.adjustmentDirection ?? "NONE",
							previewCurrency,
						)}
					/>
				</div>

				{pricingPreview.isError ? (
					<p className="text-sm text-destructive">
						No pudimos recalcular el presupuesto actual.
					</p>
				) : null}

				<BudgetSection
					key={budget?.targetTotal ?? "empty-budget"}
					currency={currency}
					targetTotal={budget?.targetTotal ?? ""}
					onChange={setBudgetTargetTotal}
				/>
				<div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4 text-sm">
					<SummaryRow
						label="Cliente"
						value={customer?.displayName || "Sin seleccionar"}
					/>
					<SummaryRow label="Ítems" value={String(itemCount)} />
					<SummaryRow
						label="Logística"
						value={getFulfillmentMethodLabel(fulfillmentMethod)}
					/>
					<SummaryRow
						label="Retiro"
						value={
							rentalPeriod.pickupDate && rentalPeriod.pickupTime !== null
								? `${rentalPeriod.pickupDate} ${minutesToTimeInput(rentalPeriod.pickupTime)}`
								: "Pendiente"
						}
					/>
				</div>

				{saveConflictModel && saveError ? (
					<OrderAvailabilityConflictFeedback
						message={saveError}
						model={saveConflictModel}
					/>
				) : saveError ? (
					<p className="text-sm text-destructive">{saveError}</p>
				) : null}

				<div className="flex flex-col gap-2">
					<Button
						type="button"
						onClick={handlePrimarySaveClick}
						disabled={isSaving}
						className="w-full"
					>
						{isSaving ? copy.savingLabel : copy.saveLabel}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={resetDraft}
						disabled={isSaving}
						className="w-full"
					>
						{copy.resetLabel}
					</Button>
				</div>

				{!isReadyForSave && (
					<p className="text-sm text-muted-foreground">{copy.incompleteText}</p>
				)}
			</CardContent>
			<Dialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Guardar cambios en pedido confirmado</DialogTitle>
						<DialogDescription>
							Este pedido ya está confirmado. Guardar cambios puede recalcular
							precio, disponibilidad, logística y documentos. El pedido seguirá
							confirmado.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsConfirmSaveOpen(false)}
							disabled={isSaving}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={() => {
								void handleSaveOrderEditor();
							}}
							disabled={isSaving}
						>
							{isSaving ? copy.savingLabel : copy.saveLabel}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

function CustomerSearchResultRow({
	customer,
	onSelect,
}: {
	customer: CustomerResponseDto;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className="hover:bg-muted/60 flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors"
		>
			<div className="min-w-0 space-y-1">
				<p className="truncate text-sm font-medium">
					{getCustomerDisplayName(customer)}
				</p>
				<p className="truncate text-xs text-muted-foreground">
					{customer.email}
				</p>
			</div>
			<span className="text-xs font-medium text-primary">Vincular</span>
		</button>
	);
}

function FulfillmentMethodOption({
	value,
	label,
	description,
}: {
	value: FulfillmentMethod;
	label: string;
	description: string;
}) {
	const id = `fulfillment-${value.toLowerCase()}`;

	return (
		<label
			htmlFor={id}
			className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/10 p-4 transition-colors hover:bg-muted/20"
		>
			<RadioGroupItem id={id} value={value} />
			<div className="space-y-1">
				<p className="text-sm font-medium">{label}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
		</label>
	);
}

function DeliveryField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return <LabeledInput label={label} value={value} onChange={onChange} />;
}

function RentalPeriodDateRangeField({
	pickupDate,
	returnDate,
	onChange,
}: {
	pickupDate: string | null;
	returnDate: string | null;
	onChange: (range: DateRange | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const value = {
		from: pickupDate ? dateParamToLocalDate(pickupDate) : undefined,
		to: returnDate ? dateParamToLocalDate(returnDate) : undefined,
	};

	const fromLabel = value.from
		? dayjs(value.from).format("DD MMM YYYY")
		: "Seleccionar";
	const toLabel = value.to
		? dayjs(value.to).format("DD MMM YYYY")
		: "Seleccionar";

	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">Fechas</p>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start gap-2 text-left"
						>
							<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
							{value.from && value.to ? (
								<span className="text-sm font-medium text-foreground tabular-nums">
									{fromLabel} - {toLabel}
								</span>
							) : (
								<span className="text-sm font-medium text-foreground">
									Seleccionar período de alquiler
								</span>
							)}
						</Button>
					}
				/>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						locale={es}
						mode="range"
						defaultMonth={value.from}
						selected={value}
						onSelect={onChange}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}

function PeriodField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">{label}</p>
			<Input
				type="time"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

function LabeledInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">{label}</p>
			<Input value={value} onChange={(event) => onChange(event.target.value)} />
		</div>
	);
}

function ItemPricingSummary({
	pricing,
}: {
	pricing: OrderPricingPreviewResponseDto["lineItems"][number] | undefined;
}) {
	if (!pricing) {
		return <span className="text-sm text-muted-foreground">Calculando...</span>;
	}

	const hasCalculatedDiscount = pricing.discountTotal !== "0.00";

	return (
		<div className="space-y-1 text-sm">
			<PricingLine
				label="Base"
				value={formatMoney(pricing.basePrice, pricing.currency)}
			/>
			{hasCalculatedDiscount ? (
				<PricingLine
					label="Descuento"
					value={`-${formatMoney(pricing.discountTotal, pricing.currency)}`}
					tone="success"
				/>
			) : null}
		</div>
	);
}

function ItemBudgetPreview({
	pricing,
}: {
	pricing: OrderPricingPreviewResponseDto["lineItems"][number] | undefined;
}) {
	if (!pricing) {
		return <span className="text-sm text-muted-foreground">Calculando...</span>;
	}

	return (
		<div className="space-y-1 text-sm">
			<PricingLine
				label="Objetivo"
				value={formatMoney(pricing.effectiveFinalPrice, pricing.currency)}
				valueClassName={pricing.hasAdjustment ? "font-semibold" : "font-medium"}
			/>
			{pricing.hasAdjustment && pricing.adjustmentDirection !== "NONE" ? (
				<PricingLine
					label={
						pricing.adjustmentDirection === "DISCOUNT" ? "Ajuste" : "Recargo"
					}
					value={formatSignedMoney(
						pricing.adjustmentAmount,
						pricing.adjustmentDirection,
						pricing.currency,
					)}
					valueClassName={
						pricing.adjustmentDirection === "DISCOUNT"
							? "font-medium text-emerald-700"
							: "font-medium text-amber-700"
					}
				/>
			) : null}
		</div>
	);
}

function BudgetSection({
	currency,
	targetTotal,
	onChange,
}: {
	currency: string;
	targetTotal: string;
	onChange: (targetTotal: string | null) => void;
}) {
	const [value, setValue] = useState(targetTotal);
	const [error, setError] = useState<string | null>(null);

	function handleApply(rawValue: string) {
		const trimmed = rawValue.trim();

		if (!trimmed) {
			onChange(null);
			setValue("");
			setError(null);
			return;
		}

		if (!isValidNonNegativeMoneyAmount(trimmed)) {
			setError("Ingresá un monto valido.");
			return;
		}

		const normalizedValue = normalizeMoneyAmount(trimmed);

		if (!normalizedValue) {
			setError("Ingresá un monto valido.");
			return;
		}

		onChange(normalizedValue);
		setValue(normalizedValue);
		setError(null);
	}

	return (
		<div className="space-y-2 rounded-lg border border-border bg-muted/10 p-4">
			<p className="text-sm font-semibold">Presupuesto</p>
			<Input
				inputMode="decimal"
				value={value}
				onChange={(event) => {
					setValue(event.target.value);
					if (error) {
						setError(null);
					}
				}}
				onBlur={() => handleApply(value)}
				placeholder={`0.00 ${currency}`}
			/>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
			<p className="text-xs text-muted-foreground">
				Se distribuye proporcionalmente entre los ítems.
			</p>
		</div>
	);
}

function PricingLine({
	label,
	value,
	tone = "default",
	valueClassName,
}: {
	label: string;
	value: string;
	tone?: "default" | "success";
	valueClassName?: string;
}) {
	const toneClassName =
		tone === "success" ? "text-emerald-700" : "text-muted-foreground";

	return (
		<div className="flex items-center justify-between gap-3">
			<span className={`text-xs ${toneClassName}`}>{label}</span>
			<span className={`text-right text-sm ${valueClassName ?? "font-medium"}`}>
				{value}
			</span>
		</div>
	);
}

function formatSignedMoney(
	amount: string,
	direction: "DISCOUNT" | "SURCHARGE" | "NONE",
	currency: string,
) {
	const formattedAmount = formatMoney(amount, currency);

	if (direction === "DISCOUNT") {
		return `-${formattedAmount}`;
	}

	if (direction === "SURCHARGE") {
		return `+${formattedAmount}`;
	}

	return formattedAmount;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-right">{value}</span>
		</div>
	);
}

function getFulfillmentMethodLabel(value: FulfillmentMethod): string {
	return value === FulfillmentMethod.DELIVERY ? "Entrega" : "Retiro";
}

function getCustomerDisplayName(customer: CustomerResponseDto): string {
	const fullName = `${customer.firstName} ${customer.lastName}`.trim();

	if (customer.isCompany && customer.companyName) {
		return `${customer.companyName} (${fullName})`;
	}

	return fullName || customer.email;
}

function minutesToTimeInput(value: number | null): string {
	if (value === null) {
		return "";
	}

	const hours = String(Math.floor(value / 60)).padStart(2, "0");
	const minutes = String(value % 60).padStart(2, "0");

	return `${hours}:${minutes}`;
}

function timeInputToMinutes(value: string): number | null {
	if (!value) {
		return null;
	}

	const [hours, minutes] = value.split(":").map(Number);

	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return null;
	}

	return hours * 60 + minutes;
}
