import type { EquipmentTypeRentalUsageOfferDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { usePricePlans } from "@/modules/pricing/price-plans/public";
import { SetPricePlanAction } from "@/modules/products/product-pricing/set-price-plan/SetPricePlanAction";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";

export function RentalOfferPriceAction({
	rentableItemId,
	offer,
}: {
	rentableItemId: string;
	offer: EquipmentTypeRentalUsageOfferDto;
}) {
	const [requested, setRequested] = useState(false);
	const productQuery = useQuery(
		rentableItemDetailQueries.detail(rentableItemId, { enabled: requested }),
	);
	const pricePlansQuery = usePricePlans(
		{ isActive: true },
		{ enabled: requested },
	);
	const fullOffer = productQuery.data?.offers.find(
		(item) => item.rentalOfferId === offer.rentalOfferId,
	);

	if (!requested) {
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setRequested(true)}
			>
				{offer.pricing.configured ? "Editar precio" : "Configurar precio"}
			</Button>
		);
	}
	if (productQuery.isPending || pricePlansQuery.isPending) {
		return (
			<Button type="button" variant="outline" size="sm" disabled>
				<Loader2 className="mr-2 size-4 animate-spin" />
				Cargando...
			</Button>
		);
	}
	if (productQuery.isError || pricePlansQuery.isError || !fullOffer) {
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => {
					void productQuery.refetch();
					void pricePlansQuery.refetch();
				}}
			>
				Reintentar
			</Button>
		);
	}
	const options = pricePlansQuery.data
		.filter((plan) => plan.isActive)
		.map((plan) => ({ id: plan.id, name: plan.name }));
	return (
		<SetPricePlanAction
			offer={fullOffer}
			ratePlanOptions={options}
			defaultOpen
			assignLabel="Configurar precio"
		/>
	);
}
