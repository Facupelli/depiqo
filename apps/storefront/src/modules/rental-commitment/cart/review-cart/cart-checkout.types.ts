import type { CreateConfirmedRentalDeliveryDetailsDto } from "@repo/api-contracts";

export type FulfillmentMethod = "PICKUP" | "DELIVERY";

export type DeliveryRequestFormState = {
	contactName: string;
	contactPhone: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	notes: string;
};

export type DeliveryRequestField = keyof DeliveryRequestFormState;

export type NormalizedDeliveryRequest =
	CreateConfirmedRentalDeliveryDetailsDto | null;
