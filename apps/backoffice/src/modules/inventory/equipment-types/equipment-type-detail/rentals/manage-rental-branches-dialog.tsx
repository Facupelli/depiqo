import type { IndividualRentalUsageDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useState } from "react";
import { usePricePlans } from "@/modules/pricing/price-plans/public";
import { AddBranchAvailabilityDialog } from "@/modules/products/branch-availability/add-branch-availability/AddBranchAvailabilityDialog";
import { EditBranchAvailabilityDialog } from "@/modules/products/branch-availability/edit-branch-availability/EditBranchAvailabilityDialog";

type Props = {
	rental: IndividualRentalUsageDto;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ManageRentalBranchesDialog({
	rental,
	open,
	onOpenChange,
}: Props) {
	const [addOpen, setAddOpen] = useState(false);
	const { data: plans = [] } = usePricePlans(
		{ isActive: true },
		{ enabled: open || addOpen },
	);
	const ratePlanOptions = plans
		.filter((plan) => plan.isActive)
		.map((plan) => ({ id: plan.id, name: plan.name }));
	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Gestionar sucursales</DialogTitle>
						<DialogDescription>
							Gestiona en qué sucursales se ofrece {rental.name}.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						{rental.offers.length ? (
							rental.offers.map((offer) => (
								<div
									key={offer.rentalOfferId}
									className="flex items-center justify-between gap-3 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="truncate font-medium text-sm">
											{offer.branchName ?? offer.branchId}
										</p>
										<p className="text-muted-foreground text-xs">
											{offer.isVisible ? "Visible en el catálogo" : "Oculta"} ·{" "}
											{offer.isRentable
												? "Disponible para alquilar"
												: "No disponible para alquilar"}
										</p>
									</div>
									<EditBranchAvailabilityDialog
										rentalOfferId={offer.rentalOfferId}
										branchName={offer.branchName}
										isVisible={offer.isVisible}
										isRentable={offer.isRentable}
									/>
								</div>
							))
						) : (
							<p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
								Este alquiler todavía no tiene ofertas por sucursal.
							</p>
						)}
						<Button
							type="button"
							onClick={() => {
								onOpenChange(false);
								setAddOpen(true);
							}}
						>
							Añadir sucursal
						</Button>
					</div>
				</DialogContent>
			</Dialog>
			<AddBranchAvailabilityDialog
				rentableItemId={rental.rentableItemId}
				existingOffers={rental.offers}
				ratePlanOptions={ratePlanOptions}
				open={addOpen}
				onOpenChange={setAddOpen}
			/>
		</>
	);
}
