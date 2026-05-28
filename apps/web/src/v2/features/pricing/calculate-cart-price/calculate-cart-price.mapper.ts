import {
	type CalculateCartPriceBodyDto,
	CalculateCartPriceBodySchema,
} from "@repo/api-contracts";

export type CalculateCartPriceBodyInput = {
	branchId: string | null | undefined;
	rentalPeriod:
		| {
				start: string | Date | null | undefined;
				end: string | Date | null | undefined;
		  }
		| null
		| undefined;
	selectedOffers: CalculateCartPriceBodyDto["selectedOffers"];
	insuranceSelected?: boolean;
	customerId?: string | null;
	couponCode?: string | null;
};

export function toCalculateCartPriceBody(
	input: CalculateCartPriceBodyInput,
): CalculateCartPriceBodyDto | null {
	const branchId = input.branchId?.trim();
	const start = toIsoDateTimeString(input.rentalPeriod?.start);
	const end = toIsoDateTimeString(input.rentalPeriod?.end);

	if (!branchId || !start || !end) {
		return null;
	}

	const body = {
		branchId,
		rentalPeriod: { start, end },
		selectedOffers: input.selectedOffers,
		insuranceSelected: input.insuranceSelected ?? false,
		customerId: input.customerId?.trim() || undefined,
		couponCode: input.couponCode?.trim() || undefined,
	};

	const parsed = CalculateCartPriceBodySchema.safeParse(body);

	return parsed.success ? parsed.data : null;
}

function toIsoDateTimeString(
	value: string | Date | null | undefined,
): string | null {
	if (!value) {
		return null;
	}

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date.toISOString();
}
