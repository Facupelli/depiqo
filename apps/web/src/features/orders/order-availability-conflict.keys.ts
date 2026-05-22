import type { UnavailableOrderItemDto } from "@repo/schemas";

export function toUnavailableOrderItemKey(item: UnavailableOrderItemDto): string {
	return item.type === "PRODUCT"
		? `PRODUCT:${item.productTypeId}`
		: `BUNDLE:${item.bundleId}`;
}
