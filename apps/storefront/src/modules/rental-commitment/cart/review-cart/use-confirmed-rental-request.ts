import {
	useCartContext,
	useCartFulfillmentContext,
	useCartPeriodContext,
	useCartPricingContext,
} from "./cart-page.context";
import {
	buildConfirmedRentalRequest,
	type ConfirmedRentalRequestResult,
} from "./confirmed-rental-request";
import { normalizeDeliveryRequest } from "./cart-checkout.utils";

export function useConfirmedRentalRequest(): ConfirmedRentalRequestResult {
	const { items } = useCartContext();
	const { branch, pickupSlot, returnSlot } = useCartPeriodContext();
	const { insuranceSelected } = useCartPricingContext();
	const { fulfillmentMethod, deliveryRequest } = useCartFulfillmentContext();

	return buildConfirmedRentalRequest({
		branchId: branch.id,
		items,
		pickupSlot,
		returnSlot,
		fulfillmentMethod,
		deliveryDetails: normalizeDeliveryRequest(deliveryRequest, "DELIVERY"),
		insuranceSelected,
	});
}
