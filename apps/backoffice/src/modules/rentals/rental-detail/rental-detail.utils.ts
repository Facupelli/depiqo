import dayjs from "@/lib/dates/dayjs";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import {
	parsePlainDecimal,
	sumDecimalStrings,
} from "@/shared/utils/decimal-string";
import type { GetRentalDetailViewResponseDto } from "./get-rental-detail-view/get-rental-detail-view.schema";

export function formatRentalDetailDateTime(value: string, timezone: string) {
	return formatTimestampInTimezone(value, timezone, "DD MMM, YYYY · HH:mm");
}

export function formatRentalDetailDateBlock(value: string, timezone: string) {
	const date = dayjs(value).tz(timezone);

	return {
		date: date.format("MMM DD, YYYY"),
		time: date.format("HH:mm"),
	};
}

export function getRentalDisplayTotal(
	rental: GetRentalDetailViewResponseDto,
	pricing: NonNullable<GetRentalDetailViewResponseDto["pricing"]>,
) {
	return getRentalDetailFinancialSummary(rental, pricing).total;
}

export function getRentalDetailFinancialSummary(
	rental: GetRentalDetailViewResponseDto,
	pricing: NonNullable<GetRentalDetailViewResponseDto["pricing"]>,
) {
	if (rental.status !== "DRAFT") {
		return {
			delivery: rental.acceptedDelivery,
			total: rental.acceptedDelivery
				? (rental.acceptedCustomerTotal ?? pricing.total)
				: pricing.total,
		};
	}
	if (rental.fulfillment.method === "PICKUP") {
		return { delivery: null, total: pricing.total };
	}
	const delivery = rental.draftDelivery;
	const charge = delivery
		? parsePlainDecimal(delivery.effectiveDeliveryCharge)
		: null;
	const equipmentTotal = parsePlainDecimal(pricing.total);
	if (
		!delivery ||
		delivery.currency !== pricing.currency ||
		!charge ||
		charge.units < 0n ||
		!equipmentTotal
	) {
		return { delivery: null, total: null };
	}
	return {
		delivery,
		total: sumDecimalStrings([pricing.total, delivery.effectiveDeliveryCharge]),
	};
}

export function getRentalCustomerInitials(value: string) {
	return (
		value
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "?"
	);
}

export function isNonEmptyString(
	value: string | null | undefined,
): value is string {
	return typeof value === "string" && value.length > 0;
}
