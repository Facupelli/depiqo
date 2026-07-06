import type { CalculateCartPriceResponseDto } from "@repo/api-contracts";
import type { Dayjs } from "dayjs";
import type { V2RentalCartItem } from "../v2-rental-cart.types";

export type CartCheckoutPeriod = {
	start: string;
	end: string;
};

export type CartOrderPeriod = {
	start: Dayjs;
	end: Dayjs;
};

export type ConflictAffectedItem = { type: "PRODUCT"; productTypeId: string };

export type ConflictGroup = {
	productTypeId: string;
	availableCount: number;
	requestedCount: number;
	affectedItems: ConflictAffectedItem[];
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

export type CartSlice = {
	cartItems: V2RentalCartItem[];
};

export type LocationSlice = {
	locationId: string;
	locationName: string | undefined;
	pickupDate: string;
	returnDate: string;
	period: CartOrderPeriod;
};

export type PricingSlice = {
	preview: CalculateCartPriceResponseDto | undefined;
	fallbackCurrency: string;
	fallbackLocale: string;
	insuranceEnabled: boolean;
	insuranceSelected: boolean;
	onInsuranceSelectedChange: (value: boolean) => void;
	couponCode: string;
	onCouponCodeChange: (value: string) => void;
	isPriceLoading: boolean;
	isPriceError: boolean;
};

export type TimesSlice = {
	pickupTime: number | undefined;
	returnTime: number | undefined;
	onPickupTimeChange: (value: number) => void;
	onReturnTimeChange: (value: number) => void;
	isTimesRequired: boolean;
};

export type DeliverySlice = {
	supportsDelivery: boolean;
	fulfillmentMethod: "PICKUP" | "DELIVERY";
	deliveryRequest: DeliveryRequestFormState;
	isDeliveryDetailsRequired: boolean;
	onFulfillmentMethodChange: (value: "PICKUP" | "DELIVERY") => void;
	onDeliveryRequestFieldChange: (
		field: DeliveryRequestField,
		value: string,
	) => void;
};

export type BookingSlice = {
	bookingMode: "instant-book" | "request-to-book";
	orderCommunicationMode: "FORMAL" | "WHATSAPP";
	isAuthenticated: boolean;
	isSubmittingOrder: boolean;
	isBookingError: boolean;
	bookingErrorMessage: string | null;
	unavailableIds: string[];
	conflictGroups: ConflictGroup[];
	submitBooking: () => Promise<void>;
};

export type CartPageContextValue = {
	cart: CartSlice;
	location: LocationSlice;
	pricing: PricingSlice;
	times: TimesSlice;
	delivery: DeliverySlice;
	booking: BookingSlice;
};
