import type { IndividualRentalUsageDto } from "@repo/api-contracts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import type { ReactNode } from "react";
import { EditBranchAvailabilityDialog } from "@/modules/products/branch-availability/edit-branch-availability/EditBranchAvailabilityDialog";
import {
	rentalPermissionLabel,
	storeVisibilityLabel,
} from "@/modules/products/branch-availability/offer-setting-labels";

type Props = {
	rental: IndividualRentalUsageDto;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	addBranchAction?: ReactNode;
};

export function ManageRentalBranchesDialog({
	rental,
	open,
	onOpenChange,
	addBranchAction,
}: Props) {
	return (
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
										{offer.branchName?.trim() || "Sucursal no disponible"}
									</p>
									<p className="text-muted-foreground text-xs">
										{storeVisibilityLabel(offer.showInStore)} ·{" "}
										{rentalPermissionLabel(offer.isRentable)}
									</p>
								</div>
								<EditBranchAvailabilityDialog
									rentalOfferId={offer.rentalOfferId}
									branchName={offer.branchName}
									showInStore={offer.showInStore}
									isRentable={offer.isRentable}
								/>
							</div>
						))
					) : (
						<p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
							Este alquiler todavía no está configurado en ninguna sucursal.
						</p>
					)}
					{addBranchAction}
				</div>
			</DialogContent>
		</Dialog>
	);
}
