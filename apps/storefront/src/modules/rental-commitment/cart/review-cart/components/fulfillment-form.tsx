import type { AddressSuggestionDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent } from "@repo/ui/components/popover";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { CheckCircle2, LoaderCircle, MapPin, Truck } from "lucide-react";
import { useId, useRef, useState } from "react";
import useDebounce from "@/shared/hooks/use-debounce";
import { useDeliveryAddressSuggestions } from "../../delivery-address-suggestions/delivery-address-suggestions.queries";
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
	const inputRef = useRef<HTMLInputElement>(null);
	const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const {
		draftDeliveryRequest,
		isDeliverySheetOpen,
		showDeliveryError,
		setDeliverySheetOpen,
		setDraftDeliveryAddress,
		selectDraftDeliveryAddress,
		confirmDeliveryRequest,
	} = useCartFulfillmentContext();
	const trimmedAddress = draftDeliveryRequest.address.trim();
	const debouncedAddress = useDebounce(trimmedAddress, 300);
	const searchableAddress =
		debouncedAddress.length >= 3 ? debouncedAddress : "";
	const suggestionsQuery = useDeliveryAddressSuggestions(searchableAddress);
	const suggestions = suggestionsQuery.data?.suggestions ?? [];
	const isSearchPending =
		trimmedAddress.length >= 3 &&
		(trimmedAddress !== debouncedAddress || suggestionsQuery.isFetching);
	const visibleHighlightedIndex = Math.min(
		highlightedIndex,
		Math.max(suggestions.length - 1, 0),
	);
	const shouldShowSuggestions = isSuggestionsOpen && trimmedAddress.length >= 3;

	function selectSuggestion(suggestion: AddressSuggestionDto) {
		selectDraftDeliveryAddress(suggestion);
		setIsSuggestionsOpen(false);
		inputRef.current?.focus();
	}

	function handleAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Escape") {
			setIsSuggestionsOpen(false);
			return;
		}

		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			if (!shouldShowSuggestions || suggestions.length === 0) return;
			event.preventDefault();
			setHighlightedIndex((current) => {
				const index = Math.min(current, suggestions.length - 1);
				return event.key === "ArrowDown"
					? (index + 1) % suggestions.length
					: (index - 1 + suggestions.length) % suggestions.length;
			});
			return;
		}

		if (event.key === "Enter" && shouldShowSuggestions) {
			const suggestion = suggestions[visibleHighlightedIndex];
			if (!suggestion) return;
			event.preventDefault();
			selectSuggestion(suggestion);
		}
	}

	function handleSheetOpenChange(open: boolean) {
		if (!open) setIsSuggestionsOpen(false);
		setDeliverySheetOpen(open);
	}

	function handleConfirm() {
		setIsSuggestionsOpen(false);
		confirmDeliveryRequest();
	}

	return (
		<Sheet open={isDeliverySheetOpen} onOpenChange={handleSheetOpenChange}>
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
							Seleccioná una dirección de la lista.
						</p>
					)}
					<div className="text-xs font-semibold">
						<label htmlFor={addressId}>Dirección de entrega</label>
						<Popover
							open={shouldShowSuggestions}
							onOpenChange={setIsSuggestionsOpen}
						>
							<Input
								ref={inputRef}
								id={addressId}
								className="mt-1.5"
								value={draftDeliveryRequest.address}
								onFocus={() => {
									if (trimmedAddress.length >= 3) setIsSuggestionsOpen(true);
								}}
								onChange={(event) => {
									const value = event.target.value;
									setDraftDeliveryAddress(value);
									setHighlightedIndex(0);
									setIsSuggestionsOpen(value.trim().length >= 3);
								}}
								onKeyDown={handleAddressKeyDown}
								placeholder="Av. Santa Fe 1234, Palermo, CABA"
								role="combobox"
								aria-autocomplete="list"
								aria-expanded={shouldShowSuggestions}
								aria-controls={`${addressId}-suggestions`}
								aria-activedescendant={
									suggestions.length > 0
										? `${addressId}-suggestion-${visibleHighlightedIndex}`
										: undefined
								}
							/>
							<PopoverContent
								anchor={inputRef}
								align="start"
								className="w-[var(--anchor-width)] p-1.5"
								initialFocus={false}
							>
								<div id={`${addressId}-suggestions`} role="listbox">
									{isSearchPending ? (
										<p className="px-2.5 py-2 text-sm text-muted-foreground">
											Buscando direcciones...
										</p>
									) : suggestionsQuery.isError ? (
										<p className="px-2.5 py-2 text-sm text-destructive">
											No pudimos buscar direcciones. Intentá nuevamente.
										</p>
									) : suggestions.length === 0 ? (
										<p className="px-2.5 py-2 text-sm text-muted-foreground">
											No encontramos direcciones.
										</p>
									) : (
										suggestions.map((suggestion, index) => (
											<button
												key={suggestion.locationId}
												id={`${addressId}-suggestion-${index}`}
												type="button"
												role="option"
												aria-selected={index === visibleHighlightedIndex}
												className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent aria-selected:bg-accent"
												onMouseDown={(event) => event.preventDefault()}
												onMouseMove={() => setHighlightedIndex(index)}
												onClick={() => selectSuggestion(suggestion)}
											>
												<span className="block font-medium">
													{suggestion.addressLine1 ??
														suggestion.formattedAddress}
												</span>
												{suggestion.addressLine2 ? (
													<span className="block text-muted-foreground">
														{suggestion.addressLine2}
													</span>
												) : null}
											</button>
										))
									)}
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</div>
				<SheetFooter className="border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => handleSheetOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button type="button" onClick={handleConfirm}>
						Confirmar dirección
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
