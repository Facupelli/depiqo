import { getGroupedOrderItems } from "@/features/orders/order-detail.utils";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";
import type {
	GroupedOrderItem,
	ProductOrderDetailItem,
} from "@/features/orders/types/order-detail.types";

export function getGroupedOrderItemsByKey(order: ParsedOrderDetailResponseDto) {
	return new Map(
		getGroupedOrderItems(order.items).map((item) => [item.key, item] as const),
	);
}

export function getProductTypeConflictName(
	order: ParsedOrderDetailResponseDto,
	productTypeId: string,
): string {
	const productItem = order.items.find(
		(item) => item.type === "PRODUCT" && item.productTypeId === productTypeId,
	);
	if (productItem) {
		return productItem.name;
	}

	for (const item of order.items) {
		if (item.type !== "BUNDLE") continue;

		const component = item.components.find(
			(entry) => entry.productTypeId === productTypeId,
		);
		if (component) {
			return component.productTypeName;
		}
	}

	return "Producto no disponible";
}

export function findAccessoryConflict(
	order: ParsedOrderDetailResponseDto,
	orderItemAccessoryId: string,
): {
	parentItem: ProductOrderDetailItem;
	accessory: ProductOrderDetailItem["accessories"][number];
} | null {
	for (const item of order.items) {
		if (item.type !== "PRODUCT") continue;

		const accessory = item.accessories.find(
			(entry) => entry.id === orderItemAccessoryId,
		);
		if (accessory) {
			return { parentItem: item, accessory };
		}
	}

	return null;
}

export type { GroupedOrderItem };
