export const CART_MONEY_FRACTION_DIGITS = 2;

export function parseCartMoneyAmount(
	value: string | undefined,
): number | undefined {
	if (value == null) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}
