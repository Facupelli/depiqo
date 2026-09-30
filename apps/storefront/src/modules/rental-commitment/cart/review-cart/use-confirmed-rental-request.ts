import { normalizeDeliveryRequest } from "./cart-checkout.utils";
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

export function useConfirmedRentalRequest(): () => ConfirmedRentalRequestResult {
	const { items } = useCartContext();
	const { branch, pickupSlot, returnSlot } = useCartPeriodContext();
	const { insuranceSelected } = useCartPricingContext();
	const { fulfillmentMethod, deliveryRequest } = useCartFulfillmentContext();

	// Build on submission so a rendered request cannot outlive its pickup time.
	return () =>
		buildConfirmedRentalRequest({
			branchId: branch.id,
			items,
			pickupSlot,
			returnSlot,
			fulfillmentMethod,
			deliveryDetails: normalizeDeliveryRequest(deliveryRequest, "DELIVERY"),
			insuranceSelected,
		});
}
