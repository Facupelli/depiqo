import { getOrderSubmitButtonLabel } from "@/features/rental-commitment/cart/storefront-cart/utils/booking-mode-copy";
import {
	useCartBookingContext,
	useCartContext,
	useCartPricingContext,
} from "../cart-page.context";
import { parseCartMoneyAmount } from "../utils/cart-money.utils";

export function useCartSidebarViewModel() {
	const { cartItems } = useCartContext();
	const {
		preview,
		fallbackCurrency,
		fallbackLocale,
		isPriceLoading,
		isPriceError,
	} = useCartPricingContext();
	const {
		bookingMode,
		orderCommunicationMode,
		isAuthenticated,
		isSubmittingOrder,
		isBookingError,
		bookingErrorMessage,
		submitBooking,
	} = useCartBookingContext();

	const isSubmitDisabled =
		cartItems.length === 0 ||
		isPriceLoading ||
		isPriceError ||
		isSubmittingOrder;
	const displayCurrency = preview?.currency ?? fallbackCurrency;
	const displayLocale = preview?.locale ?? fallbackLocale;
	const totalAmount = parseCartMoneyAmount(preview?.total);
	const ctaLabel = isSubmittingOrder
		? "Creando pedido..."
		: getOrderSubmitButtonLabel({
				bookingMode,
				orderCommunicationMode,
				isAuthenticated,
			});

	return {
		isSubmitDisabled,
		displayCurrency,
		displayLocale,
		totalAmount,
		ctaLabel,
		isPriceLoading,
		isSubmittingOrder,
		isAuthenticated,
		isBookingError,
		bookingErrorMessage,
		submitBooking,
	};
}
