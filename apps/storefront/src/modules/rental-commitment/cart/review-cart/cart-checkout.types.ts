export type FulfillmentMethod = "PICKUP" | "DELIVERY";

export type DeliveryRequestFormState = {
	address: string;
	locationId: string | null;
};

export type CompleteDeliveryRequest = {
	address: string;
	locationId: string;
};

export type NormalizedDeliveryRequest = {
	address: string;
	locationId: string | null;
} | null;
