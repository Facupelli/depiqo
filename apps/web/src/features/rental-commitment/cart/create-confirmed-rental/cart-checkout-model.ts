import type {
	CalculateCartPriceBodyDto,
	CreateConfirmedRentalBodyDto,
	CreateConfirmedRentalDeliveryDetailsDto,
} from "@repo/api-contracts";
import dayjs from "@/lib/dates/dayjs";
import type { V2RentalCartItem } from "../v2-rental-cart.types";
import type { CartCheckoutPeriod } from "./cart-checkout.types";

type BuildCartRentalPeriodParams = {
	periodStart: string;
	periodEnd: string;
	timezone: string;
	pickupTime?: number;
	returnTime?: number;
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
	return dayjs
		.tz(date, timezone)
		.startOf("day")
		.add(minuteOfDay ?? 0, "minute")
		.toDate();
}

export function buildCartRentalPeriod({
	periodStart,
	periodEnd,
	timezone,
	pickupTime,
	returnTime,
}: BuildCartRentalPeriodParams): CartCheckoutPeriod {
	return {
		start: toRentalPeriodDateTime(
			periodStart,
			pickupTime,
			timezone,
		).toISOString(),
		end: toRentalPeriodDateTime(periodEnd, returnTime, timezone).toISOString(),
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
		period: {
			start: new Date(rentalPeriod.start),
			end: new Date(rentalPeriod.end),
		},
		selectedOffers: buildCartSelectedOffers({ cartItems }),
		fulfillmentMethod,
		deliveryDetails:
			fulfillmentMethod === "DELIVERY"
				? (deliveryDetails ?? undefined)
				: undefined,
		insuranceSelected,
	};
}
