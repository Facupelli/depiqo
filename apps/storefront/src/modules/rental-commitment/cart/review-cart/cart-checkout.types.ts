import type { CreateConfirmedRentalDeliveryDetailsDto } from "@repo/api-contracts";

export type FulfillmentMethod = "PICKUP" | "DELIVERY";

export type DeliveryRequestFormState = {
	address: string;
};

export type NormalizedDeliveryRequest =
	CreateConfirmedRentalDeliveryDetailsDto | null;
