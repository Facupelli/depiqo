import type { GetRentalConfirmationSummaryResponseDto } from "@repo/api-contracts";
import type { GetRentalDetailViewResponseDto } from "./get-rental-detail-view/get-rental-detail-view.schema";

export type RentalConfirmationSummary = {
	reservedEquipmentCount: number;
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
	delivery: {
		label: string;
		address: string;
	} | null;
	deliveryCharge: string | null;
	equipmentAmount: string;
	insuranceAmount: string;
	total: {
		amount: string;
		currency: string;
	};
};

export function countRentalReservationUnits(
	selections: readonly {
		demandLines: readonly { quantity: number }[];
	}[],
): number {
	return selections.reduce(
		(total, selection) =>
			total +
			selection.demandLines.reduce((sum, line) => sum + line.quantity, 0),
		0,
	);
}

export function buildRentalConfirmationSummary(
	rental: GetRentalDetailViewResponseDto,
	timezone: string,
	cost?: GetRentalConfirmationSummaryResponseDto,
): RentalConfirmationSummary | null {
	if (!cost || cost.rentalVersion !== rental.version) {
		return null;
	}

	return {
		reservedEquipmentCount: countRentalReservationUnits(rental.selections),
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
		delivery: cost.deliveryDetails
			? {
					label:
						cost.delivery?.arrangement === "STAFF_ARRANGED"
							? "Entrega personalizada"
							: "Entrega a domicilio",
					address:
						cost.deliveryDetails.formattedAddress ||
						cost.deliveryDetails.address,
				}
			: null,
		deliveryCharge: cost.deliveryCharge,
		equipmentAmount: cost.equipmentAmount,
		insuranceAmount: cost.insuranceAmount,
		total: {
			amount: cost.customerTotal,
			currency: cost.currency,
		},
	};
}
