import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useStore } from "@tanstack/react-form";
import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { useRentalOfferAvailability } from "@/modules/rentals/shared/rental-offers/rental-offer-availability.queries";
import { withForm } from "@/shared/contexts/form.context";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import {
	buildDraftRentalPeriod,
	createDraftRentalComposerDefaultValues,
	type DraftRentalComposerFormValues,
	type DraftRentalSelectedOfferFormValues,
} from "../draft-rental-composer.schema";

export const DraftRentalSelectedOffersSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		const { branchMissing, timezone } = useDraftRentalComposer();
		const values = useStore(form.store, (state) => state.values);
		const selectedOffers = values.selectedOffers;
		const effectivePeriod = buildEffectiveRentalPeriod(values, timezone);
		const rentalOfferIds = [
			...new Set(
				selectedOffers.map(
					(offer: DraftRentalSelectedOfferFormValues) => offer.rentalOfferId,
				),
			),
		];
		const availabilityReady =
			!branchMissing &&
			!!values.branchId &&
			effectivePeriod !== null &&
			rentalOfferIds.length > 0;
		const availabilityQuery = useRentalOfferAvailability(
			{
				branchId: values.branchId || "missing",
				periodStart: effectivePeriod?.start ?? "",
				periodEnd: effectivePeriod?.end ?? "",
				rentalOfferIds,
			},
			{ enabled: availabilityReady },
		);
		const availableCountByRentalOfferId = new Map(
			(availabilityQuery.data ?? []).map((item) => [
				item.rentalOfferId,
				item.availableCount,
			]),
		);

		function getCurrentAvailability(
			rentalOfferId: string,
		): CurrentAvailability {
			if (!availabilityReady || availabilityQuery.isPending) return null;
			if (availabilityQuery.isError) return "error";

			return availableCountByRentalOfferId.get(rentalOfferId) ?? null;
		}

		function updateQuantity(
			rentalOfferId: string,
			quantity: number,
			options: { capToAvailability?: boolean } = {},
		) {
			form.setFieldValue(
				"selectedOffers",
				selectedOffers.map((offer: DraftRentalSelectedOfferFormValues) => {
					if (offer.rentalOfferId !== rentalOfferId) {
						return offer;
					}

					const normalizedQuantity = Number.isFinite(quantity)
						? Math.max(1, Math.floor(quantity))
						: 1;
					const availableCount = getCurrentAvailability(rentalOfferId);
					const shouldCapToAvailability =
						options.capToAvailability !== false &&
						typeof availableCount === "number";
					const nextQuantity = shouldCapToAvailability
						? Math.max(1, Math.min(normalizedQuantity, availableCount))
						: normalizedQuantity;

					return { ...offer, quantity: nextQuantity };
				}),
			);
		}

		function removeOffer(rentalOfferId: string) {
			form.setFieldValue(
				"selectedOffers",
				selectedOffers.filter(
					(offer: DraftRentalSelectedOfferFormValues) =>
						offer.rentalOfferId !== rentalOfferId,
				),
			);
		}

		return (
			<section
				className="mt-4 border-t pt-4"
				aria-label="Productos seleccionados"
			>
				<h3 className="mb-2.5 font-medium text-sm">Seleccionados</h3>
				{selectedOffers.length === 0 ? (
					<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center text-muted-foreground text-sm">
						<Package className="size-5" />
						Añadí al menos un producto para crear el borrador.
					</div>
				) : (
					<div className="divide-y rounded-lg border">
						{selectedOffers.map((offer: DraftRentalSelectedOfferFormValues) => {
							const availableCount = getCurrentAvailability(
								offer.rentalOfferId,
							);
							const quantityWarning =
								typeof availableCount === "number"
									? getQuantityAvailabilityWarning(
											offer.quantity,
											availableCount,
										)
									: null;
							const canIncrease =
								typeof availableCount === "number" &&
								availableCount > 0 &&
								offer.quantity < availableCount;

							return (
								<div
									key={offer.rentalOfferId}
									className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-x-3 gap-y-2 p-3 md:grid-cols-[minmax(0,1fr)_minmax(9rem,auto)_120px_40px]"
								>
									<p className="col-span-2 truncate font-medium text-sm md:col-span-1">
										{offer.name}
									</p>
									<div className="min-w-0">
										<p className="text-muted-foreground text-xs">
											{getAvailabilityLabel(availableCount)}
										</p>
										{quantityWarning ? (
											<p className="text-amber-700 text-xs" aria-live="polite">
												{quantityWarning}
											</p>
										) : null}
									</div>
									<div className="flex w-fit max-w-full items-center gap-1">
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											disabled={offer.quantity <= 1}
											onClick={() =>
												updateQuantity(
													offer.rentalOfferId,
													offer.quantity - 1,
													{ capToAvailability: false },
												)
											}
											aria-label={`Reducir cantidad de ${offer.name}`}
										>
											<Minus className="size-3.5" />
										</Button>
										<Input
											type="number"
											min={1}
											max={
												typeof availableCount === "number" && availableCount > 0
													? availableCount
													: undefined
											}
											step={1}
											aria-label={`Cantidad de ${offer.name}`}
											aria-invalid={quantityWarning !== null}
											className="h-8 w-12 px-1 text-center font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											value={offer.quantity}
											onChange={(event) =>
												updateQuantity(
													offer.rentalOfferId,
													Number(event.target.value),
												)
											}
										/>
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											disabled={!canIncrease}
											onClick={() =>
												updateQuantity(offer.rentalOfferId, offer.quantity + 1)
											}
											aria-label={`Aumentar cantidad de ${offer.name}`}
										>
											<Plus className="size-3.5" />
										</Button>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label={`Quitar ${offer.name}`}
										onClick={() => removeOffer(offer.rentalOfferId)}
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</section>
		);
	},
});

type CurrentAvailability = number | null | "error";

function getAvailabilityLabel(availableCount: CurrentAvailability): string {
	if (availableCount === "error") {
		return "No se pudo consultar la disponibilidad";
	}
	if (availableCount === null) return "Disponibilidad pendiente";
	if (availableCount === 1) return "1 disponible";
	return `${availableCount} disponibles`;
}

function getQuantityAvailabilityWarning(
	quantity: number,
	availableCount: number | null,
): string | null {
	if (availableCount === null || quantity <= availableCount) return null;
	if (availableCount === 0)
		return "No hay unidades disponibles para este período.";

	const unitLabel =
		availableCount === 1 ? "unidad disponible" : "unidades disponibles";
	return `Solo hay ${availableCount} ${unitLabel} para este período.`;
}

function buildEffectiveRentalPeriod(
	values: DraftRentalComposerFormValues,
	timezone: string,
): { start: string; end: string } | null {
	if (!values.periodStartDate || !values.periodEndDate) return null;

	try {
		const period = buildDraftRentalPeriod(values, timezone);
		return Date.parse(period.start) < Date.parse(period.end) ? period : null;
	} catch {
		return null;
	}
}
