import type { CreateConfirmedRentalDeliveryDetailsDto } from "@repo/api-contracts";
import type { DeliveryRequestFormState } from "./cart-checkout.types";

export function normalizeDeliveryRequest({
	deliveryRequest,
	fulfillmentMethod,
}: {
	deliveryRequest: DeliveryRequestFormState;
	fulfillmentMethod: "PICKUP" | "DELIVERY";
}): CreateConfirmedRentalDeliveryDetailsDto | null {
	if (fulfillmentMethod !== "DELIVERY") {
		return null;
	}

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
	deliveryRequest: CreateConfirmedRentalDeliveryDetailsDto | null,
) {
	if (!deliveryRequest) {
		return false;
	}

	return Boolean(
		deliveryRequest.contactName &&
			deliveryRequest.contactPhone &&
			deliveryRequest.addressLine1 &&
			deliveryRequest.city &&
			deliveryRequest.state &&
			deliveryRequest.postalCode &&
			deliveryRequest.country,
	);
}
