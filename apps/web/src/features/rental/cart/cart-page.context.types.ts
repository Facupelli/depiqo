import type { CartPriceResult, TenantPricingConfig } from "@repo/schemas";
import type {
	BookingMode,
	FulfillmentMethod,
	OrderCommunicationMode,
} from "@repo/types";
import type { CartItem, ConflictGroup } from "./cart.types";
import type {
	CartOrderPeriod,
	DeliveryRequestField,
	DeliveryRequestFormState,
	JoinedLineItem,
} from "./cart-order.types";

export type CartSlice = {
	cartItems: CartItem[];
};

export type LocationSlice = {
	locationId: string;
	locationName: string | undefined;
	pickupDate: string;
	returnDate: string;
	period: CartOrderPeriod;
};

export type PricingSlice = {
	priceConfig: TenantPricingConfig;
	breakdown: CartPriceResult | undefined;
	joinedLineItems: JoinedLineItem[] | undefined;
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
	fulfillmentMethod: FulfillmentMethod;
	deliveryRequest: DeliveryRequestFormState;
	isDeliveryDetailsRequired: boolean;
	onFulfillmentMethodChange: (value: FulfillmentMethod) => void;
	onDeliveryRequestFieldChange: (
		field: DeliveryRequestField,
		value: string,
	) => void;
};

export type BookingSlice = {
	bookingMode: BookingMode;
	orderCommunicationMode: OrderCommunicationMode;
	isAuthenticated: boolean;
	isSubmittingOrder: boolean;
	isBookingError: boolean;
	bookingErrorMessage: string | null;
	unavailableIds: string[];
	conflictGroups: ConflictGroup[];
	handleBook: () => Promise<void>;
};

export type CartPageContextValue = {
	cart: CartSlice;
	location: LocationSlice;
	pricing: PricingSlice;
	times: TimesSlice;
	delivery: DeliverySlice;
	booking: BookingSlice;
};
