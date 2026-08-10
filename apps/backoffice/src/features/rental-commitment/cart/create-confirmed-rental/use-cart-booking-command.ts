import type {
	BranchScheduleSlotDto,
	CreateConfirmedRentalDeliveryDetailsDto,
} from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import dayjs from "@/lib/dates/dayjs";
import { getCurrentRelativeRedirect } from "@/shared/auth/auth-redirect";
import { getPortalAuthRedirectSearch } from "@/shared/auth/portal-auth-redirect";
import { useCreateConfirmedRental } from "../../confirmed-rentals/create-confirmed-rental/create-confirmed-rental.mutation";
import type { V2RentalCartItem } from "../v2-rental-cart.types";
import { parseCartBookingError } from "./cart-booking-errors";
import type { CartCheckoutPeriod } from "./cart-checkout.types";
import { isDeliveryRequestComplete } from "./cart-checkout-delivery";
import { buildCreateConfirmedRentalBody } from "./cart-checkout-model";

const formatSlot = (minutes: number): string =>
	dayjs().startOf("day").add(minutes, "minute").format("h:mm A");

type UseCartBookingCommandParams = {
	branch: {
		id: string;
		name: string;
	};

	periodStart: string;
	rentalPeriod: CartCheckoutPeriod;

	cartItems: V2RentalCartItem[];

	isAuthenticated: boolean;

	pickupSlot: BranchScheduleSlotDto | undefined;
	returnSlot: BranchScheduleSlotDto | undefined;
	requireTimes: () => void;

	fulfillmentMethod: "PICKUP" | "DELIVERY";
	normalizedDeliveryRequest: CreateConfirmedRentalDeliveryDetailsDto | null;
	requireDeliveryDetails: () => void;
	onFulfillmentMethodChange: (value: "PICKUP" | "DELIVERY") => void;

	insuranceSelected: boolean;

	clearCart: () => void;
};

export function useCartBookingCommand({
	branch,
	periodStart,
	rentalPeriod,
	cartItems,
	isAuthenticated,
	pickupSlot,
	returnSlot,
	requireTimes,
	fulfillmentMethod,
	normalizedDeliveryRequest,
	requireDeliveryDetails,
	onFulfillmentMethodChange,
	insuranceSelected,
	clearCart,
}: UseCartBookingCommandParams) {
	const navigate = useNavigate();

	const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(
		null,
	);

	const { mutateAsync: createConfirmedRental, isPending: isSubmittingOrder } =
		useCreateConfirmedRental();

	// const idempotency = useCreateOrderIdempotency();

	const submitBooking = async () => {
		setBookingErrorMessage(null);

		if (!isAuthenticated) {
			navigate({
				to: "/login",
				search: getPortalAuthRedirectSearch(
					getCurrentRelativeRedirect("/cart"),
				),
			});
			return;
		}

		if (pickupSlot === undefined || returnSlot === undefined) {
			requireTimes();
			return;
		}

		if (
			fulfillmentMethod === "DELIVERY" &&
			!isDeliveryRequestComplete(normalizedDeliveryRequest)
		) {
			requireDeliveryDetails();
			return;
		}

		try {
			await createConfirmedRental({
				body: buildCreateConfirmedRentalBody({
					branchId: branch.id,
					rentalPeriod,
					cartItems,
					fulfillmentMethod,
					deliveryDetails: normalizedDeliveryRequest,
					insuranceSelected,
				}),
			});

			clearCart();

			navigate({
				to: "/confirmed-rental-success",
				search: {
					fulfillmentMethod,
					pickupDate: periodStart,
					pickupLocation: branch.name,
					pickupTime: formatSlot(pickupSlot.minuteOfDay),
					deliveryAddress:
						fulfillmentMethod === "DELIVERY" && normalizedDeliveryRequest
							? [
									normalizedDeliveryRequest.addressLine1,
									normalizedDeliveryRequest.city,
								]
									.filter(Boolean)
									.join(" · ")
							: undefined,
				},
			});
		} catch (error) {
			const parsedError = parseCartBookingError(error);

			switch (parsedError.kind) {
				case "availability-conflict":
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
					onFulfillmentMethodChange("PICKUP");
					setBookingErrorMessage(parsedError.message);
					return;

				case "idempotency-conflict":
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
		isSubmittingOrder,
		isBookingError: Boolean(bookingErrorMessage),
		bookingErrorMessage,
		submitBooking,
	};
}
