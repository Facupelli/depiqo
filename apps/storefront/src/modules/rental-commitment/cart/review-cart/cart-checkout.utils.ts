import type {
	DeliveryRequestFormState,
	FulfillmentMethod,
	NormalizedDeliveryRequest,
} from "./cart-checkout.types";

export function createDeliveryRequestDefaultValues(): DeliveryRequestFormState {
	return {
		contactName: "",
		contactPhone: "",
		addressLine1: "",
		addressLine2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "",
		notes: "",
	};
}

export function normalizeDeliveryRequest(
	deliveryRequest: DeliveryRequestFormState,
	fulfillmentMethod: FulfillmentMethod,
): NormalizedDeliveryRequest {
	if (fulfillmentMethod !== "DELIVERY") return null;

	return {
		contactName: deliveryRequest.contactName.trim() || undefined,
		contactPhone: deliveryRequest.contactPhone.trim() || undefined,
		addressLine1: deliveryRequest.addressLine1.trim(),
		addressLine2: deliveryRequest.addressLine2.trim() || undefined,
		city: deliveryRequest.city.trim(),
		state: deliveryRequest.state.trim() || undefined,
		postalCode: deliveryRequest.postalCode.trim() || undefined,
		country: deliveryRequest.country.trim() || undefined,
		notes: deliveryRequest.notes.trim() || undefined,
	};
}

export function isDeliveryRequestComplete(
	deliveryRequest: NormalizedDeliveryRequest,
): boolean {
	return Boolean(
		deliveryRequest?.contactName &&
			deliveryRequest.contactPhone &&
			deliveryRequest.addressLine1 &&
			deliveryRequest.city &&
			deliveryRequest.state &&
			deliveryRequest.postalCode &&
			deliveryRequest.country,
	);
}

export function formatDeliveryAddressSummary(
	deliveryRequest: DeliveryRequestFormState,
): string {
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
