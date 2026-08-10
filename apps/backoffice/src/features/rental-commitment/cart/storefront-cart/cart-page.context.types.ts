import type {
	BranchScheduleSlotDto,
	CalculateCartPriceResponseDto,
} from "@repo/api-contracts";
import type { V2RentalCartItem } from "@/features/rental-commitment/cart/v2-rental-cart.types";
import type {
	CartOrderPeriod,
	DeliveryRequestField,
	DeliveryRequestFormState,
} from "./cart-order.types";

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
	pickupSlot: BranchScheduleSlotDto | undefined;
	returnSlot: BranchScheduleSlotDto | undefined;
	onPickupSlotChange: (value: BranchScheduleSlotDto) => void;
	onReturnSlotChange: (value: BranchScheduleSlotDto) => void;
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
