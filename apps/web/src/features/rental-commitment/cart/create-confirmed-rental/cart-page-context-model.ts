import type {
	CalculateCartPriceResponseDto,
	GetPublicTenantConfigResponseDto,
} from "@repo/api-contracts";
import dayjs from "@/lib/dates/dayjs";
import type { V2RentalCartItem } from "../v2-rental-cart.types";
import type { CartPageContextValue } from "./cart-checkout.types";

type BuildCartPageContextValueParams = {
	tenantPublicConfig: GetPublicTenantConfigResponseDto;

	branch: {
		id: string;
		name: string;
		supportsDelivery: boolean;
	};

	periodStart: string;
	periodEnd: string;

	cartItems: V2RentalCartItem[];

	draft: {
		insuranceSelected: boolean;
		onInsuranceSelectedChange: (value: boolean) => void;
		couponCode: string;
		onCouponCodeChange: (value: string) => void;

		times: {
			pickupTime: number | undefined;
			returnTime: number | undefined;
			onPickupTimeChange: (value: number) => void;
			onReturnTimeChange: (value: number) => void;
			isTimesRequired: boolean;
		};

		delivery: {
			supportsDelivery: boolean;
			fulfillmentMethod: CartPageContextValue["delivery"]["fulfillmentMethod"];
			deliveryRequest: CartPageContextValue["delivery"]["deliveryRequest"];
			isDeliveryDetailsRequired: boolean;
			onFulfillmentMethodChange: CartPageContextValue["delivery"]["onFulfillmentMethodChange"];
			onDeliveryRequestFieldChange: CartPageContextValue["delivery"]["onDeliveryRequestFieldChange"];
		};
	};

	pricePreview: {
		pricing: CalculateCartPriceResponseDto | undefined;
		isPriceLoading: boolean;
		isPriceError: boolean;
	};

	booking: Omit<
		CartPageContextValue["booking"],
		"bookingMode" | "orderCommunicationMode" | "isAuthenticated"
	>;

	isAuthenticated: boolean;
};

export function buildCartPageContextValue({
	tenantPublicConfig,
	branch,
	periodStart,
	periodEnd,
	cartItems,
	draft,
	pricePreview,
	booking,
	isAuthenticated,
}: BuildCartPageContextValueParams): CartPageContextValue {
	return {
		cart: {
			cartItems,
		},
		location: {
			locationId: branch.id,
			locationName: branch.name === "-" ? undefined : branch.name,
			pickupDate: periodStart,
			returnDate: periodEnd,
			period: {
				start: dayjs(periodStart),
				end: dayjs(periodEnd),
			},
		},
		pricing: {
			preview: pricePreview.pricing,
			fallbackCurrency: tenantPublicConfig.currency,
			fallbackLocale: tenantPublicConfig.locale,
			insuranceEnabled: tenantPublicConfig.insuranceEnabled,
			insuranceSelected: draft.insuranceSelected,
			onInsuranceSelectedChange: draft.onInsuranceSelectedChange,
			couponCode: draft.couponCode,
			onCouponCodeChange: draft.onCouponCodeChange,
			isPriceLoading: pricePreview.isPriceLoading,
			isPriceError: pricePreview.isPriceError,
		},
		times: {
			pickupTime: draft.times.pickupTime,
			returnTime: draft.times.returnTime,
			onPickupTimeChange: draft.times.onPickupTimeChange,
			onReturnTimeChange: draft.times.onReturnTimeChange,
			isTimesRequired: draft.times.isTimesRequired,
		},
		delivery: {
			supportsDelivery: draft.delivery.supportsDelivery,
			fulfillmentMethod: draft.delivery.fulfillmentMethod,
			deliveryRequest: draft.delivery.deliveryRequest,
			isDeliveryDetailsRequired: draft.delivery.isDeliveryDetailsRequired,
			onFulfillmentMethodChange: draft.delivery.onFulfillmentMethodChange,
			onDeliveryRequestFieldChange: draft.delivery.onDeliveryRequestFieldChange,
		},
		booking: {
			bookingMode: tenantPublicConfig.bookingMode,
			orderCommunicationMode: tenantPublicConfig.communicationMode,
			isAuthenticated,
			isSubmittingOrder: booking.isSubmittingOrder,
			isBookingError: booking.isBookingError,
			bookingErrorMessage: booking.bookingErrorMessage,
			unavailableIds: booking.unavailableIds,
			conflictGroups: booking.conflictGroups,
			submitBooking: booking.submitBooking,
		},
	};
}
