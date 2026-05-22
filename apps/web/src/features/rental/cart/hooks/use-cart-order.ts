import type { RentalLocationResponse, TenantRentalConfig } from "@repo/schemas";
import { CreateOrderNextStepType, FulfillmentMethod } from "@repo/types";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getCurrentRelativeRedirect } from "@/features/auth/auth-redirect";
import { useCreateOrder } from "@/features/orders/orders.mutations";
import { useCurrentPortalSession } from "@/features/rental/auth/portal-auth.queries";
import {
	useCartActions,
	useCartItems,
} from "@/features/rental/cart/cart.hooks";
import type { CartPageContextValue } from "@/features/rental/cart/cart-page.context.types";
import { getPortalAuthRedirectSearch } from "../../auth/portal-auth.redirect";
import type { ConflictGroup } from "../cart.types";
import { formatSlot } from "../cart.utils";
import { parseCartBookingError } from "../cart-booking-errors";
import { isDeliveryRequestComplete } from "../cart-order.utils";
import { retryCreateOrderWhenInProgress } from "../cart-order-idempotency-retry";
import {
	buildCartCreateOrderDto,
	createCartCreateOrderSubmissionSignature,
} from "../cart-order-submit.utils";
import { useCartOrderDelivery } from "./use-cart-order-delivery";
import { useCartOrderPricing } from "./use-cart-order-pricing";
import { useCartOrderTimes } from "./use-cart-order-times";
import { useCreateOrderIdempotency } from "./use-create-order-idempotency";

type UseCartOrderParams = {
	tenantRentalConfig: TenantRentalConfig;
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
 * - Track booking conflicts for inline recovery
 * - Track unexpected booking errors for inline error display
 */
export function useCartOrder({
	tenantRentalConfig,
	location,
	pickupDate,
	returnDate,
}: UseCartOrderParams) {
	const navigate = useNavigate();
	const { data: sessionUser } = useCurrentPortalSession();
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

	const { mutateAsync: createOrder, isPending: isSubmittingOrder } =
		useCreateOrder();
	const idempotency = useCreateOrderIdempotency();

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
			const dto = buildCartCreateOrderDto({
				locationId: location.id,
				pickupDate,
				returnDate,
				currency: "USD",
				items: pricing.itemPayload,
				insuranceSelected,
				couponCode,
				fulfillmentMethod: delivery.fulfillmentMethod,
				deliveryRequest: delivery.normalizedDeliveryRequest,
				pickupTime: times.pickupTime,
				returnTime: times.returnTime,
			});

			const signature = createCartCreateOrderSubmissionSignature(dto);
			const idempotencyKey = idempotency.getKeyForSignature(signature);

			const createdOrder = await retryCreateOrderWhenInProgress(() =>
				createOrder({
					dto,
					idempotencyKey,
				}),
			);

			idempotency.clear();
			clearCart();

			if (
				createdOrder.nextStep.type ===
				CreateOrderNextStepType.REDIRECT_TO_WHATSAPP
			) {
				if (!createdOrder.nextStep.whatsappUrl) {
					navigate({ to: "/order-created-contact-team" });
					return;
				}

				navigate({
					to: "/order-created-whatsapp",
					search: {
						whatsappUrl: createdOrder.nextStep.whatsappUrl,
					},
				});
				return;
			}

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
			const parsedError = parseCartBookingError(error);

			switch (parsedError.kind) {
				case "availability-conflict":
					setUnavailableIds(parsedError.unavailableIds);
					setConflictGroups(parsedError.conflictGroups);
					setBookingErrorMessage(parsedError.message);
					return;
				case "auth":
					navigate({
						to: "/login",
						search: getPortalAuthRedirectSearch(
							getCurrentRelativeRedirect("/cart"),
						),
					});
					return;
				case "delivery-not-supported":
					delivery.onFulfillmentMethodChange(FulfillmentMethod.PICKUP);
					setBookingErrorMessage(parsedError.message);
					return;
				case "idempotency-conflict":
					idempotency.discard();
					setBookingErrorMessage(parsedError.message);
					return;
				case "idempotency-in-progress":
					setBookingErrorMessage(parsedError.message);
					return;
				case "unknown":
					setBookingErrorMessage(parsedError.message);
					return;
			}
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
			priceConfig: tenantPricingConfig,
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
			bookingMode: tenantRentalConfig.bookingMode,
			orderCommunicationMode:
				tenantRentalConfig.communication.orderCommunicationMode,
			isAuthenticated: Boolean(sessionUser),
			isSubmittingOrder,
			isBookingError: Boolean(bookingErrorMessage),
			bookingErrorMessage,
			unavailableIds,
			conflictGroups,
			handleBook,
		},
	} satisfies CartPageContextValue;
}
