import type { DeliveryRequestFormState } from "../cart-order.types";

export function formatDeliveryAddressSummary(
	deliveryRequest: DeliveryRequestFormState,
) {
	return [
		deliveryRequest.addressLine1.trim(),
		deliveryRequest.addressLine2.trim(),
		[
			deliveryRequest.city.trim(),
			deliveryRequest.state.trim(),
			deliveryRequest.postalCode.trim(),
		]
			.filter(Boolean)
			.join(", "),
		deliveryRequest.country.trim(),
	]
		.filter(Boolean)
		.join(" · ");
}
