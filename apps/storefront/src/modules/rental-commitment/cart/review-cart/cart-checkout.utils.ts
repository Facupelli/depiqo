import type {
	DeliveryRequestFormState,
	FulfillmentMethod,
	NormalizedDeliveryRequest,
} from "./cart-checkout.types";

export function createDeliveryRequestDefaultValues(): DeliveryRequestFormState {
	return { address: "" };
}

export function normalizeDeliveryRequest(
	deliveryRequest: DeliveryRequestFormState,
	fulfillmentMethod: FulfillmentMethod,
): NormalizedDeliveryRequest {
	if (fulfillmentMethod !== "DELIVERY") return null;

	return { address: deliveryRequest.address.trim() };
}

export function isDeliveryRequestComplete(
	deliveryRequest: NormalizedDeliveryRequest,
): boolean {
	return Boolean(deliveryRequest?.address);
}

export function formatDeliveryAddressSummary(
	deliveryRequest: DeliveryRequestFormState,
): string {
	return deliveryRequest.address.trim();
}
