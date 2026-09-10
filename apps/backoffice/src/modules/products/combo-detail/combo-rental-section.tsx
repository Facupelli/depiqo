import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { usePricePlans } from "@/modules/pricing/price-plans/public";
import { AddBranchAvailabilityDialog } from "../branch-availability/add-branch-availability/AddBranchAvailabilityDialog";
import { RentalOfferCard } from "../branch-availability/rental-offer-card";
export function ComboRentalSection({
	combo,
}: {
	combo: GetRentableItemDetailResponseDto;
}) {
	const [addOpen, setAddOpen] = useState(false);
	const plansQuery = usePricePlans({ isActive: true });
	const ratePlanOptionsStatus = plansQuery.isPending
		? "loading"
		: plansQuery.isError
			? "error"
			: "ready";
	const options = plansQuery.data
		? plansQuery.data
				.filter((plan) => plan.tierCount > 0)
				.map((plan) => ({ id: plan.id, name: plan.name }))
		: [];
	return (
		<section className="rounded-xl border bg-card">
			<div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
				<div>
					<h2 className="font-semibold">Sucursales</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Gestiona visibilidad, disponibilidad y precios para cada sucursal.
					</p>
				</div>
				<Button
					type="button"
					onClick={() => setAddOpen(true)}
					disabled={plansQuery.isPending}
				>
					<Plus className="mr-2 size-4" />
					Añadir sucursal
				</Button>
			</div>
			<div className="p-5 sm:p-6">
				{plansQuery.isError ? (
					<div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
						<p className="mr-auto">
							No pudimos cargar los planes disponibles. Las ofertas siguen
							visibles, pero no puedes seleccionar un plan existente.
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => plansQuery.refetch()}
							disabled={plansQuery.isFetching}
						>
							{plansQuery.isFetching ? "Reintentando..." : "Reintentar"}
						</Button>
					</div>
				) : null}
				{combo.offers.length === 0 ? (
					<div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
						<p className="font-medium">
							Este combo todavía no se ofrece en ninguna sucursal.
						</p>
						<Button
							type="button"
							className="mt-4"
							disabled={plansQuery.isPending}
							variant="outline"
							onClick={() => setAddOpen(true)}
						>
							Añadir sucursal
						</Button>
					</div>
				) : (
					<div className="space-y-3">
						{combo.offers.map((offer) => (
							<RentalOfferCard
								key={offer.rentalOfferId}
								offer={offer}
								ratePlanOptions={options}
								ratePlanOptionsStatus={ratePlanOptionsStatus}
							/>
						))}
					</div>
				)}
			</div>
			<AddBranchAvailabilityDialog
				rentableItemId={combo.id}
				existingOffers={combo.offers}
				ratePlanOptions={options}
				ratePlanOptionsStatus={ratePlanOptionsStatus}
				open={addOpen}
				onOpenChange={setAddOpen}
			/>
		</section>
	);
}
