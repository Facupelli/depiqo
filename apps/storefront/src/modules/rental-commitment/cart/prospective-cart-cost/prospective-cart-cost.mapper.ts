import {
	type ProspectiveCartCostBodyDto,
	ProspectiveCartCostBodySchema,
} from "@repo/api-contracts";
import type {
	DeliveryRequestFormState,
	FulfillmentMethod,
} from "../review-cart/cart-checkout.types";
import {
	isDeliveryRequestComplete,
	normalizeDeliveryRequest,
} from "../review-cart/cart-checkout.utils";

export type ProspectiveCartCostInput = {
	branchId: string | null | undefined;
	periodStart: string | null | undefined;
	periodEnd: string | null | undefined;
	selectedOffers: ProspectiveCartCostBodyDto["selectedOffers"];
	insuranceSelected: boolean;
	couponCode: string;
	fulfillmentMethod: FulfillmentMethod;
	committedDeliveryDetails: DeliveryRequestFormState;
};

export function toProspectiveCartCostBody(
	input: ProspectiveCartCostInput,
): ProspectiveCartCostBodyDto | null {
	const deliveryDetails = normalizeDeliveryRequest(
		input.committedDeliveryDetails,
		input.fulfillmentMethod,
	);
	if (
		!input.branchId ||
		!input.periodStart ||
		!input.periodEnd ||
		input.selectedOffers.length === 0 ||
		new Date(input.periodEnd) <= new Date(input.periodStart) ||
		(input.fulfillmentMethod === "DELIVERY" &&
			!isDeliveryRequestComplete(deliveryDetails))
	) {
		return null;
	}

	const committedDeliveryDetails =
		input.fulfillmentMethod === "DELIVERY" && deliveryDetails?.locationId
			? {
					address: deliveryDetails.address,
					locationId: deliveryDetails.locationId,
				}
			: undefined;

	const result = ProspectiveCartCostBodySchema.safeParse({
		branchId: input.branchId,
		rentalPeriod: {
			start: input.periodStart,
			end: input.periodEnd,
		},
		selectedOffers: input.selectedOffers,
		insuranceSelected: input.insuranceSelected,
		couponCode: input.couponCode.trim() || undefined,
		fulfillmentMethod: input.fulfillmentMethod,
		deliveryDetails: committedDeliveryDetails,
	});

	return result.success ? result.data : null;
}
