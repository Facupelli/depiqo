import {
	type BranchScheduleSlotDto,
	type CreateConfirmedRentalBodyDto,
	CreateConfirmedRentalBodySchema,
} from "@repo/api-contracts";
import type { RentalCartItem } from "../rental-cart.types";
import type {
	FulfillmentMethod,
	NormalizedDeliveryRequest,
} from "./cart-checkout.types";
import { isDeliveryRequestComplete } from "./cart-checkout.utils";

type ConfirmedRentalSelection = Pick<
	RentalCartItem,
	"rentalOfferId" | "quantity"
>;

export type ConfirmedRentalRequestInput = {
	branchId: string;
	items: ConfirmedRentalSelection[];
	pickupSlot?: BranchScheduleSlotDto;
	returnSlot?: BranchScheduleSlotDto;
	fulfillmentMethod: FulfillmentMethod;
	deliveryDetails: NormalizedDeliveryRequest;
	insuranceSelected: boolean;
};

export type ConfirmedRentalRequestFailure =
	| { kind: "EMPTY_CART" }
	| { kind: "PICKUP_SLOT_REQUIRED" }
	| { kind: "RETURN_SLOT_REQUIRED" }
	| { kind: "INVALID_RENTAL_PERIOD" }
	| { kind: "DELIVERY_DETAILS_REQUIRED" }
	| { kind: "INVALID_REQUEST"; issues: string[] };

export type ConfirmedRentalRequestResult =
	| { ok: true; body: CreateConfirmedRentalBodyDto }
	| { ok: false; failure: ConfirmedRentalRequestFailure };

export function buildConfirmedRentalRequest(
	input: ConfirmedRentalRequestInput,
): ConfirmedRentalRequestResult {
	if (input.items.length === 0)
		return { ok: false, failure: { kind: "EMPTY_CART" } };
	if (!input.pickupSlot)
		return { ok: false, failure: { kind: "PICKUP_SLOT_REQUIRED" } };
	if (!input.returnSlot)
		return { ok: false, failure: { kind: "RETURN_SLOT_REQUIRED" } };

	const start = Date.parse(input.pickupSlot.instant);
	const end = Date.parse(input.returnSlot.instant);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
		return { ok: false, failure: { kind: "INVALID_RENTAL_PERIOD" } };
	}

	if (
		input.fulfillmentMethod === "DELIVERY" &&
		!isDeliveryRequestComplete(input.deliveryDetails)
	) {
		return { ok: false, failure: { kind: "DELIVERY_DETAILS_REQUIRED" } };
	}

	const committedDeliveryDetails =
		input.fulfillmentMethod === "DELIVERY" && input.deliveryDetails?.locationId
			? {
					address: input.deliveryDetails.address,
					locationId: input.deliveryDetails.locationId,
				}
			: undefined;

	const body: CreateConfirmedRentalBodyDto = {
		branchId: input.branchId,
		period: {
			start: input.pickupSlot.instant,
			end: input.returnSlot.instant,
		},
		selectedOffers: input.items.map(({ rentalOfferId, quantity }) => ({
			rentalOfferId,
			quantity,
		})),
		fulfillmentMethod: input.fulfillmentMethod,
		deliveryDetails: committedDeliveryDetails,
		insuranceSelected: input.insuranceSelected,
	};
	const parsed = CreateConfirmedRentalBodySchema.safeParse(body);

	if (!parsed.success) {
		return {
			ok: false,
			failure: {
				kind: "INVALID_REQUEST",
				issues: parsed.error.issues.map((issue) => issue.message),
			},
		};
	}

	return { ok: true, body };
}
