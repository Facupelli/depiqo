import type { CartDiscountLineItem, CartPriceLineItem } from "@repo/schemas";
import dayjs from "@/lib/dates/dayjs";

export const formatSlot = (minutes: number): string =>
	dayjs().startOf("day").add(minutes, "minute").format("h:mm A");

/**
 * Formats a single discount for display in the cart.
 *
 * Cart preview discounts are promotion-based percentages only.
 */
export function formatDiscount(
	discount: CartDiscountLineItem,
	_currency: string,
	_locale: string,
): string {
	return `\u2212${discount.value}%`;
}

/**
 * Reconstructs the pre-discount subtotal for a single line item.
 *
 * The backend returns `subtotal` (post-discount) and each discount's
 * `discountAmount`. We sum the discounts back on top to get the original price,
 * which is used to render the strikethrough price next to the discounted one.
 */
export function computeOriginalSubtotal(item: CartPriceLineItem): number {
	const totalDiscount = item.discounts.reduce(
		(acc, d) => acc + d.discountAmount,
		0,
	);
	return item.subtotal + totalDiscount;
}
