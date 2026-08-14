import type { GetRentalDetailViewResponseDto } from "./get-rental-detail-view/get-rental-detail-view.schema";

export type RentalConfirmationSummary = {
	period: {
		start: string;
		end: string;
		timezone: string;
	};
	equipment: Array<{
		id: string;
		name: string;
		quantity: number;
		children: Array<{
			id: string;
			name: string;
			quantity: number;
		}>;
	}>;
	accessories: Array<{
		id: string;
		name: string;
		quantity: number;
	}>;
	total: {
		amount: string;
		currency: string;
	};
};

export function buildRentalConfirmationSummary(
	rental: GetRentalDetailViewResponseDto,
	timezone: string,
): RentalConfirmationSummary | null {
	if (!rental.pricing || rental.pricing.kind === "LEGACY") {
		return null;
	}

	return {
		period: {
			start: rental.period.start,
			end: rental.period.end,
			timezone,
		},
		equipment: rental.selections.map((selection) => ({
			id: selection.id,
			name: selection.rentableItemName,
			quantity: selection.quantity,
			children:
				selection.rentableItemKind === "SINGLE"
					? []
					: selection.demandLines.map((demandLine) => ({
							id: demandLine.id,
							name: demandLine.equipmentTypeName,
							quantity: demandLine.quantity,
						})),
		})),
		accessories: rental.accessories.map((accessory) => ({
			id: accessory.id,
			name: accessory.equipmentTypeName,
			quantity: accessory.quantity,
		})),
		total: {
			amount: rental.pricing.total,
			currency: rental.pricing.currency,
		},
	};
}
