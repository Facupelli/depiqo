import type {
	OrderItemsUnavailableProblemDto,
	UnavailableOrderItemDto,
} from "@repo/schemas";
import { toUnavailableOrderItemKey } from "@/features/orders/order-availability-conflict.keys";
import {
	findAccessoryConflict,
	type GroupedOrderItem,
	getGroupedOrderItemsByKey,
	getProductTypeConflictName,
} from "@/features/orders/order-availability-conflict.lookup";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

type ConflictItemKindLabel = "Producto" | "Combo";

export type OrderAvailabilityConflictAffectedItem = {
	key: string;
	label: string;
	kindLabel: ConflictItemKindLabel;
	quantity: number;
};

export type OrderAvailabilityInventoryConflictDisplay = {
	key: string;
	productTypeName: string;
	availableCount: number;
	requestedCount: number;
	affectedItems: OrderAvailabilityConflictAffectedItem[];
};

export type OrderAvailabilityAccessoryConflictDisplay = {
	key: string;
	accessoryName: string;
	parentItemName: string;
	availableCount: number;
	requestedCount: number;
};

export type OrderAvailabilityConflictDisplayModel = {
	inventoryConflicts: OrderAvailabilityInventoryConflictDisplay[];
	accessoryConflicts: OrderAvailabilityAccessoryConflictDisplay[];
	unavailableItems: OrderAvailabilityConflictAffectedItem[];
};

export function buildOrderAvailabilityConflictDisplayModel({
	order,
	conflict,
}: {
	order: ParsedOrderDetailResponseDto;
	conflict: OrderItemsUnavailableProblemDto;
}): OrderAvailabilityConflictDisplayModel {
	const groupedItemByKey = getGroupedOrderItemsByKey(order);

	const inventoryConflicts = conflict.conflictGroups.map((group) => ({
		key: group.productTypeId,
		productTypeName: getProductTypeConflictName(order, group.productTypeId),
		availableCount: group.availableCount,
		requestedCount: group.requestedCount,
		affectedItems: dedupeAffectedItems(
			group.affectedItems
				.map((item) => toAffectedItemDisplay(item, groupedItemByKey))
				.filter((item): item is OrderAvailabilityConflictAffectedItem =>
					Boolean(item),
				),
		),
	}));

	const accessoryConflicts = conflict.accessoryConflicts
		.map((entry) => {
			const resolved = findAccessoryConflict(order, entry.orderItemAccessoryId);
			if (!resolved) {
				return null;
			}

			return {
				key: entry.orderItemAccessoryId,
				accessoryName: resolved.accessory.name,
				parentItemName: resolved.parentItem.name,
				availableCount: entry.availableCount,
				requestedCount: entry.requestedCount,
			} satisfies OrderAvailabilityAccessoryConflictDisplay;
		})
		.filter((item): item is OrderAvailabilityAccessoryConflictDisplay =>
			Boolean(item),
		);

	const unavailableItems = dedupeAffectedItems(
		conflict.unavailableItems
			.filter(
				(item) =>
					!isItemRepresentedInInventoryConflicts(
						item,
						conflict.conflictGroups,
					) && !isItemRepresentedInAccessoryConflicts(item, order, conflict),
			)
			.map((item) => toAffectedItemDisplay(item, groupedItemByKey))
			.filter((item): item is OrderAvailabilityConflictAffectedItem =>
				Boolean(item),
			),
	);

	return {
		inventoryConflicts,
		accessoryConflicts,
		unavailableItems,
	};
}

function toAffectedItemDisplay(
	item: UnavailableOrderItemDto,
	groupedItemByKey: Map<string, GroupedOrderItem>,
): OrderAvailabilityConflictAffectedItem | null {
	const groupedItem = groupedItemByKey.get(toUnavailableOrderItemKey(item));
	if (!groupedItem) {
		return null;
	}

	return {
		key: groupedItem.key,
		label: groupedItem.name,
		kindLabel: groupedItem.type === "PRODUCT" ? "Producto" : "Combo",
		quantity: groupedItem.quantity,
	};
}

function dedupeAffectedItems(items: OrderAvailabilityConflictAffectedItem[]) {
	return [...new Map(items.map((item) => [item.key, item] as const)).values()];
}

function isItemRepresentedInInventoryConflicts(
	item: UnavailableOrderItemDto,
	groups: OrderItemsUnavailableProblemDto["conflictGroups"],
) {
	return groups.some((group) =>
		group.affectedItems.some(
			(affected) =>
				toUnavailableOrderItemKey(affected) === toUnavailableOrderItemKey(item),
		),
	);
}

function isItemRepresentedInAccessoryConflicts(
	item: UnavailableOrderItemDto,
	order: ParsedOrderDetailResponseDto,
	conflict: OrderItemsUnavailableProblemDto,
) {
	if (item.type !== "PRODUCT") {
		return false;
	}

	return conflict.accessoryConflicts.some((entry) => {
		const resolved = findAccessoryConflict(order, entry.orderItemAccessoryId);
		// When an accessory conflict points back to the same product type, we prefer
		// the richer accessory-specific explanation instead of duplicating the item row.
		return resolved?.parentItem.productTypeId === item.productTypeId;
	});
}
