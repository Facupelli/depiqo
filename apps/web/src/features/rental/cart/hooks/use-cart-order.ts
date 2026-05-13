import type { RentalLocationResponse } from "@repo/schemas";
import { FulfillmentMethod } from "@repo/types";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateOrder } from "@/features/orders/orders.queries";
import {
	useCartActions,
	useCartItems,
} from "@/features/rental/cart/cart.hooks";
import { useCurrentPortalSession } from "@/features/rental/auth/portal-auth.queries";
import { getCurrentRelativeRedirect } from "@/features/auth/auth-redirect";
import type { CartPageContextValue } from "@/features/rental/cart/cart-page.context.types";
import { getPortalAuthRedirectSearch } from "../../auth/portal-auth.redirect";
import type { ConflictGroup } from "../cart.types";
import { formatSlot } from "../cart.utils";
import {
	extractBookingConflicts,
	isDeliveryNotSupportedError,
	isDeliveryRequestComplete,
} from "../cart-order.utils";
import { isAuthError } from "@/shared/errors";
import { useCartOrderDelivery } from "./use-cart-order-delivery";
import { useCartOrderPricing } from "./use-cart-order-pricing";
import { useCartOrderTimes } from "./use-cart-order-times";
import { useTenantRentalConfig } from "../../tenant/tenant.queries";

type UseCartOrderParams = {
	location: {
		id: string;
		name: string;
		supportsDelivery: boolean;
		deliveryDefaults: NonNullable<RentalLocationResponse["deliveryDefaults"]>;
	};
	pickupDate: string;
	returnDate: string;
};

/**
 * Owns all data-fetching and mutation logic for the cart page.
 *
 * Responsibilities:
 * - Own pickup/return time state and their change handlers
 * - Validate times before booking and expose the error state to the view
 * - Convert date-only route params to dayjs once (Layer 1 → Layer 2)
 * - Build the shared item payload (once, shared between preview + submit)
 * - Fetch the price preview
 * - Join line items with cart item names (so views don't touch the cart store)
 * - Submit the order and navigate on success
 * - Track unavailable item IDs on 422 errors
 * - Track unexpected booking errors (non-422) for inline error display
 */
export function useCartOrder({
	location,
	pickupDate,
	returnDate,
}: UseCartOrderParams) {
	const navigate = useNavigate();
	const { data: sessionUser } = useCurrentPortalSession();
	const { data: tenantRentalConfig } = useTenantRentalConfig();
	const tenantPricingConfig = tenantRentalConfig.pricing;
	const cartItems = useCartItems();
	const { clearCart } = useCartActions();

	const [insuranceSelected, setInsuranceSelected] = useState(
		tenantPricingConfig.insuranceEnabled,
	);
	const [couponCode, setCouponCode] = useState("");
	const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
	const [conflictGroups, setConflictGroups] = useState<ConflictGroup[]>([]);
	const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(
		null,
	);

	const onInsuranceSelectedChange = (value: boolean) => {
		setInsuranceSelected(value);
	};

	const onCouponCodeChange = (value: string) => {
		setCouponCode(value);
	};

	const times = useCartOrderTimes();
	const delivery = useCartOrderDelivery({
		supportsDelivery: location.supportsDelivery,
		deliveryDefaults: {
			country: location.deliveryDefaults.country ?? "",
			stateRegion: location.deliveryDefaults.stateRegion ?? "",
			city: location.deliveryDefaults.city ?? "",
			postalCode: location.deliveryDefaults.postalCode ?? "",
		},
	});
	const pricing = useCartOrderPricing({
		locationId: location.id,
		pickupDate,
		returnDate,
		pickupTime: times.pickupTime,
		returnTime: times.returnTime,
		insuranceSelected,
		customerId:
			sessionUser?.kind === "customerAccount" ? sessionUser.userId : undefined,
		couponCode,
		cartItems,
	});

	const { mutateAsync: createOrder } = useCreateOrder();

	const handleBook = async () => {
		setUnavailableIds([]);
		setConflictGroups([]);
		setBookingErrorMessage(null);

		if (!sessionUser) {
			navigate({
				to: "/login",
				search: getPortalAuthRedirectSearch(
					getCurrentRelativeRedirect("/cart"),
				),
			});
			return;
		}

		if (!times.pickupTime || !times.returnTime) {
			times.requireTimes();
			return;
		}

		if (
			delivery.fulfillmentMethod === FulfillmentMethod.DELIVERY &&
			!isDeliveryRequestComplete(delivery.normalizedDeliveryRequest)
		) {
			delivery.requireDeliveryDetails();
			return;
		}

		try {
			const createdOrder = await createOrder({
				locationId: location.id,
				pickupDate,
				returnDate,
				currency: "USD",
				items: pricing.itemPayload,
				insuranceSelected,
				couponCode: couponCode.trim() || undefined,
				fulfillmentMethod: delivery.fulfillmentMethod,
				deliveryRequest: delivery.normalizedDeliveryRequest,
				pickupTime: times.pickupTime,
				returnTime: times.returnTime,
			});

			clearCart();

			navigate({
				to: "/order-confirmation",
				search: {
					pickupDate: pricing.period.start.format("YYYY-MM-DD"),
					pickupLocation: location.name,
					pickupTime: formatSlot(times.pickupTime),
					status: createdOrder.status,
					bookingMode: tenantRentalConfig.bookingMode,
				},
			});
		} catch (error) {
			const conflicts = extractBookingConflicts(error);
			if (conflicts) {
				setUnavailableIds(conflicts.unavailableIds);
				setConflictGroups(conflicts.conflictGroups);
				return;
			}

			if (isAuthError(error)) {
				navigate({
					to: "/login",
					search: getPortalAuthRedirectSearch(
						getCurrentRelativeRedirect("/cart"),
					),
				});
				return;
			}

			if (isDeliveryNotSupportedError(error)) {
				delivery.onFulfillmentMethodChange(FulfillmentMethod.PICKUP);
				setBookingErrorMessage(
					"Esta sucursal solo permite retiro en el local.",
				);
				return;
			}

			// Any non-422 error (5xx, network failure, etc.) — surface inline
			// without re-throwing, so the page stays intact and the user can retry.
			setBookingErrorMessage(
				"La reserva falló inesperadamente. Por favor, intentalo de nuevo.",
			);
		}
	};

	return {
		cart: {
			cartItems,
		},
		location: {
			locationId: location.id,
			locationName: location.name === "-" ? undefined : location.name,
			pickupDate,
			returnDate,
			period: pricing.period,
		},
		pricing: {
			breakdown: pricing.breakdown,
			joinedLineItems: pricing.joinedLineItems,
			insuranceSelected,
			onInsuranceSelectedChange,
			couponCode,
			onCouponCodeChange,
			isPriceLoading: pricing.isPriceLoading,
			isPriceError: pricing.isPriceError,
		},
		times: {
			pickupTime: times.pickupTime,
			returnTime: times.returnTime,
			onPickupTimeChange: times.onPickupTimeChange,
			onReturnTimeChange: times.onReturnTimeChange,
			isTimesRequired: times.isTimesRequired,
		},
		delivery: {
			supportsDelivery: delivery.supportsDelivery,
			fulfillmentMethod: delivery.fulfillmentMethod,
			deliveryRequest: delivery.deliveryRequest,
			isDeliveryDetailsRequired: delivery.isDeliveryDetailsRequired,
			onFulfillmentMethodChange: delivery.onFulfillmentMethodChange,
			onDeliveryRequestFieldChange: delivery.onDeliveryRequestFieldChange,
		},
		booking: {
			isAuthenticated: Boolean(sessionUser),
			isBookingError: Boolean(bookingErrorMessage),
			bookingErrorMessage,
			unavailableIds,
			conflictGroups,
			handleBook,
		},
	} satisfies CartPageContextValue;
}
