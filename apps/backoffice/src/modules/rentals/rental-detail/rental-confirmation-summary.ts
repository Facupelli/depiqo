import type { GetRentalConfirmationSummaryResponseDto } from "@repo/api-contracts";
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
	deliveryCharge: string | null;
	equipmentAmount: string;
	insuranceAmount: string;
	total: {
		amount: string;
		currency: string;
	};
};

export function buildRentalConfirmationSummary(
	rental: GetRentalDetailViewResponseDto,
	timezone: string,
	cost?: GetRentalConfirmationSummaryResponseDto,
): RentalConfirmationSummary | null {
	if (!cost || cost.rentalVersion !== rental.version) {
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
		deliveryCharge: cost.deliveryCharge,
		equipmentAmount: cost.equipmentAmount,
		insuranceAmount: cost.insuranceAmount,
		total: {
			amount: cost.customerTotal,
			currency: cost.currency,
		},
	};
}
