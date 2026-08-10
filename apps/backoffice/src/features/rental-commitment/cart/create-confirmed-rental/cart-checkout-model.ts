import type {
	CalculateCartPriceBodyDto,
	CreateConfirmedRentalBodyDto,
	CreateConfirmedRentalDeliveryDetailsDto,
} from "@repo/api-contracts";
import { resolveLocalDateTime } from "@repo/temporal";
import type { V2RentalCartItem } from "../v2-rental-cart.types";
import type { CartCheckoutPeriod } from "./cart-checkout.types";

type BuildCartRentalPeriodParams = {
	periodStart: string;
	periodEnd: string;
	timezone: string;
	pickupTime?: number;
	returnTime?: number;
	pickupInstant?: string;
	returnInstant?: string;
};

type BuildCartSelectedOffersParams = {
	cartItems: V2RentalCartItem[];
};

type BuildCartPricePreviewBodyParams = {
	branchId: string;
	rentalPeriod: CartCheckoutPeriod;
	insuranceSelected: boolean;
	couponCode: string;
	customerId?: string;
	cartItems: V2RentalCartItem[];
};

type BuildCreateConfirmedRentalBodyParams = {
	branchId: string;
	rentalPeriod: CartCheckoutPeriod;
	cartItems: V2RentalCartItem[];
	fulfillmentMethod: "PICKUP" | "DELIVERY";
	deliveryDetails: CreateConfirmedRentalDeliveryDetailsDto | null;
	insuranceSelected: boolean;
};

export function toRentalPeriodDateTime(
	date: string,
	minuteOfDay: number | undefined,
	timezone: string,
): Date {
	const resolution = resolveLocalDateTime({
		localDate: date,
		minuteOfDay: minuteOfDay ?? 0,
		timeZone: timezone,
	});

	if (resolution.kind === "nonexistent") {
		throw new RangeError(
			"The selected local time does not exist in the branch timezone.",
		);
	}

	return resolution.instant;
}

export function buildCartRentalPeriod({
	periodStart,
	periodEnd,
	timezone,
	pickupTime,
	returnTime,
	pickupInstant,
	returnInstant,
}: BuildCartRentalPeriodParams): CartCheckoutPeriod {
	return {
		start:
			pickupInstant ??
			toRentalPeriodDateTime(periodStart, pickupTime, timezone).toISOString(),
		end:
			returnInstant ??
			toRentalPeriodDateTime(periodEnd, returnTime, timezone).toISOString(),
	};
}

export function isValidCartRentalPeriod(
	rentalPeriod: CartCheckoutPeriod,
): boolean {
	return new Date(rentalPeriod.end) > new Date(rentalPeriod.start);
}

export function buildCartSelectedOffers({
	cartItems,
}: BuildCartSelectedOffersParams) {
	return cartItems.map((item) => ({
		rentalOfferId: item.rentalOfferId,
		quantity: item.quantity,
	}));
}

export function buildCartPricePreviewBody({
	branchId,
	rentalPeriod,
	insuranceSelected,
	couponCode,
	customerId,
	cartItems,
}: BuildCartPricePreviewBodyParams): CalculateCartPriceBodyDto {
	return {
		branchId,
		rentalPeriod,
		insuranceSelected,
		couponCode,
		customerId,
		selectedOffers: buildCartSelectedOffers({ cartItems }),
	};
}

export function buildCreateConfirmedRentalBody({
	branchId,
	rentalPeriod,
	cartItems,
	fulfillmentMethod,
	deliveryDetails,
	insuranceSelected,
}: BuildCreateConfirmedRentalBodyParams): CreateConfirmedRentalBodyDto {
	return {
		branchId,
		period: rentalPeriod,
		selectedOffers: buildCartSelectedOffers({ cartItems }),
		fulfillmentMethod,
		deliveryDetails:
			fulfillmentMethod === "DELIVERY"
				? (deliveryDetails ?? undefined)
				: undefined,
		insuranceSelected,
	};
}
