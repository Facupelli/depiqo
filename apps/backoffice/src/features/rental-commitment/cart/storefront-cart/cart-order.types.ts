import type { Dayjs } from "dayjs";

export type CartOrderPeriod = {
	start: Dayjs;
	end: Dayjs;
};

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

export type DeliveryDefaultsFormState = Pick<
	DeliveryRequestFormState,
	"country" | "state" | "city" | "postalCode"
>;

export type DeliveryRequestField = keyof DeliveryRequestFormState;

export const EMPTY_DELIVERY_REQUEST: DeliveryRequestFormState = {
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
