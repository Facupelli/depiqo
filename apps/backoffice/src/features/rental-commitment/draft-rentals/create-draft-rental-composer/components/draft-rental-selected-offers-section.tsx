import { useStore } from "@tanstack/react-form";
import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { withForm } from "@/shared/contexts/form.context";
import {
	createDraftRentalComposerDefaultValues,
	type DraftRentalSelectedOfferFormValues,
} from "../create-draft-rental-composer.schema";

export const DraftRentalSelectedOffersSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		const selectedOffers = useStore(
			form.store,
			(state) => state.values.selectedOffers,
		);

		function updateQuantity(rentalOfferId: string, quantity: number) {
			form.setFieldValue(
				"selectedOffers",
				selectedOffers.map((offer: DraftRentalSelectedOfferFormValues) => {
					if (offer.rentalOfferId !== rentalOfferId) {
						return offer;
					}

					const cappedQuantity =
						offer.availableCount === null
							? quantity
							: Math.min(quantity, offer.availableCount);

					return { ...offer, quantity: Math.max(1, cappedQuantity) };
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
			<Card className="shadow-xs">
				<CardHeader>
					<CardTitle className="text-base">Ítems del borrador</CardTitle>
				</CardHeader>
				<CardContent>
					{selectedOffers.length === 0 ? (
						<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
							<Package className="size-5" />
							Agregá al menos un producto para crear el borrador.
						</div>
					) : (
						<div className="divide-y rounded-lg border">
							{selectedOffers.map(
								(offer: DraftRentalSelectedOfferFormValues) => (
									<div
										key={offer.rentalOfferId}
										className="grid gap-3 p-3 md:grid-cols-[1fr_120px_40px] md:items-center"
									>
										<div className="min-w-0">
											<p className="truncate font-medium text-sm">
												{offer.name}
											</p>
											<p className="text-muted-foreground text-xs">
												{offer.availableCount === null
													? "Sin límite informado"
													: `Máximo ${offer.availableCount}`}
											</p>
										</div>
										<Input
											type="number"
											min={1}
											max={offer.availableCount ?? undefined}
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
											variant="ghost"
											size="icon"
											onClick={() => removeOffer(offer.rentalOfferId)}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								),
							)}
						</div>
					)}
				</CardContent>
			</Card>
		);
	},
});
