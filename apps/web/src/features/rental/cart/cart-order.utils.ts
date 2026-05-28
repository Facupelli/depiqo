import type { CreateConfirmedRentalDeliveryDetailsDto } from "@repo/api-contracts";
import type {
	CalculateCartPricesRequest,
	CartPriceLineItem,
} from "@repo/schemas";
import type { CartItem } from "./cart.types";
import type {
	DeliveryRequestFormState,
	JoinedLineItem,
} from "./cart-order.types";

export function buildCartOrderItemPayload(cartItems: CartItem[]) {
	return cartItems.map((item) =>
		item.type === "PRODUCT"
			? {
					type: "PRODUCT" as const,
					productTypeId: item.productTypeId,
					quantity: item.quantity,
				}
			: {
					type: "BUNDLE" as const,
					bundleId: item.bundleId,
					quantity: item.quantity,
				},
	);
}

export function buildCartPricePreviewRequest({
	locationId,
	pickupDate,
	returnDate,
	pickupTime,
	returnTime,
	itemPayload,
	insuranceSelected,
	customerId,
	couponCode,
}: {
	locationId: string;
	pickupDate: string;
	returnDate: string;
	pickupTime?: number;
	returnTime?: number;
	itemPayload: ReturnType<typeof buildCartOrderItemPayload>;
	insuranceSelected: boolean;
	customerId?: string;
	couponCode?: string;
}): CalculateCartPricesRequest {
	return {
		currency: "USD",
		locationId,
		pickupDate,
		returnDate,
		pickupTime,
		returnTime,
		items: itemPayload,
		insuranceSelected,
		customerId,
		couponCode: couponCode?.trim() || undefined,
	};
}

export function joinCartLineItems({
	lineItems,
	cartItems,
}: {
	lineItems: CartPriceLineItem[] | undefined;
	cartItems: CartItem[];
}): JoinedLineItem[] | undefined {
	return lineItems?.map((line) => {
		const cartItem = cartItems.find(
			(item) =>
				(item.type === "PRODUCT" && item.productTypeId === line.id) ||
				(item.type === "BUNDLE" && item.bundleId === line.id),
		);

		return { ...line, name: cartItem?.name ?? line.id };
	});
}

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
