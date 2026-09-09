import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { RentalOfferCard } from "@/modules/products/branch-availability/rental-offer-card";
import type { PricePlanOption } from "@/modules/products/product-pricing/price-plan-selection/PricePlanSelectionForm";

export const PRODUCT_AVAILABILITY_SECTION_ID = "product-availability";

export function ProductAvailabilitySection({
	product,
	ratePlanOptions,
}: {
	product: GetRentableItemDetailResponseDto;
	ratePlanOptions: PricePlanOption[];
}) {
	return (
		<section
			id={PRODUCT_AVAILABILITY_SECTION_ID}
			className="scroll-mt-6 rounded-2xl border bg-background p-5 shadow-sm"
		>
			<div className="mb-4">
				<h2 className="font-semibold text-lg tracking-tight">
					Ofertas por sucursal
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Configura la visibilidad, disponibilidad para alquilar y precio en
					cada sucursal.
				</p>
			</div>
			{product.offers.length === 0 ? (
				<div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
					Este ítem todavía no se ofrece en ninguna sucursal.
				</div>
			) : (
				<div className="space-y-3">
					{product.offers.map((offer) => (
						<RentalOfferCard
							key={offer.rentalOfferId}
							offer={offer}
							ratePlanOptions={ratePlanOptions}
						/>
					))}
				</div>
			)}
		</section>
	);
}
