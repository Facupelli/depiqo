import { formatCurrency } from "@/shared/utils/price.utils";

export const CART_MONEY_FRACTION_DIGITS = 2;

export function parseCartMoneyAmount(
	value: string | undefined,
): number | undefined {
	if (value == null) return undefined;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatCartMoney(
	value: string | number,
	currency: string,
	locale: string,
): string {
	const amount =
		typeof value === "number" ? value : parseCartMoneyAmount(value);

	return amount == null
		? "-"
		: formatCurrency(amount, currency, locale, CART_MONEY_FRACTION_DIGITS);
}
