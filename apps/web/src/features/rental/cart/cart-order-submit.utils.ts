import type { CreateOrderDto } from "@repo/schemas";
import type { FulfillmentMethod } from "@repo/types";

type BuildCartCreateOrderDtoParams = {
	locationId: string;
	pickupDate: string;
	returnDate: string;
	pickupTime: number;
	returnTime: number;
	currency: string;
	items: CreateOrderDto["items"];
	insuranceSelected: boolean;
	couponCode: string;
	fulfillmentMethod: FulfillmentMethod;
	deliveryRequest: CreateOrderDto["deliveryRequest"];
};

export function buildCartCreateOrderDto({
	locationId,
	pickupDate,
	returnDate,
	pickupTime,
	returnTime,
	currency,
	items,
	insuranceSelected,
	couponCode,
	fulfillmentMethod,
	deliveryRequest,
}: BuildCartCreateOrderDtoParams): CreateOrderDto {
	return {
		locationId,
		pickupDate,
		returnDate,
		pickupTime,
		returnTime,
		currency,
		items,
		insuranceSelected,
		couponCode: couponCode.trim() || undefined,
		fulfillmentMethod,
		deliveryRequest,
	};
}

export function createCartCreateOrderSubmissionSignature(
	dto: CreateOrderDto,
): string {
	return stableStringify(dto);
}

function stableStringify(value: unknown): string {
	return JSON.stringify(toStableJsonValue(value));
}

function toStableJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(toStableJsonValue);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
				.map(([key, entryValue]) => [key, toStableJsonValue(entryValue)]),
		);
	}

	return value;
}
