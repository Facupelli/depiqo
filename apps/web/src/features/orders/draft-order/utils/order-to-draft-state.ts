import { FulfillmentMethod, OrderItemType } from "@repo/types";
import type {
	DraftOrderItem,
	DraftOrderSelectedBundleItem,
	DraftOrderSelectedProductItem,
	DraftOrderState,
} from "@/features/orders/draft-order/types/draft-order.types";
import { EMPTY_DRAFT_ORDER_DELIVERY_REQUEST } from "@/features/orders/draft-order/types/draft-order.types";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export function orderToDraftOrderState(
	order: ParsedOrderDetailResponseDto,
): DraftOrderState {
	const hasManualPricing = order.financial.items.some(
		(item) => item.pricing.isOverridden,
	);

	return {
		currency: order.financial.items[0]?.currency ?? "USD",
		customer: order.customer
			? {
					id: order.customer.id,
					displayName:
						order.customer.companyName ??
						`${order.customer.firstName} ${order.customer.lastName}`.trim(),
				}
			: null,
		rentalPeriod: {
			pickupDate: order.bookingSnapshot.pickupDate.format("YYYY-MM-DD"),
			returnDate: order.bookingSnapshot.returnDate.format("YYYY-MM-DD"),
			pickupTime: order.bookingSnapshot.pickupTime,
			returnTime: order.bookingSnapshot.returnTime,
		},
		fulfillmentMethod: order.fulfillmentMethod,
		deliveryRequest: order.deliveryRequest
			? {
					recipientName: order.deliveryRequest.recipientName,
					phone: order.deliveryRequest.phone,
					addressLine1: order.deliveryRequest.addressLine1,
					addressLine2: order.deliveryRequest.addressLine2 ?? "",
					city: order.deliveryRequest.city,
					stateRegion: order.deliveryRequest.stateRegion,
					postalCode: order.deliveryRequest.postalCode,
					country: order.deliveryRequest.country,
					instructions: order.deliveryRequest.instructions ?? "",
				}
			: order.fulfillmentMethod === FulfillmentMethod.DELIVERY
				? EMPTY_DRAFT_ORDER_DELIVERY_REQUEST
				: null,
		items: order.items.map((item) => orderItemToDraftItem(item)),
		budget: hasManualPricing
			? {
					targetTotal: order.financial.itemsSubtotal,
				}
			: null,
	};
}

function orderItemToDraftItem(
	item: ParsedOrderDetailResponseDto["items"][number],
): DraftOrderItem {
	return {
		draftItemId: item.id,
		selection:
			item.type === OrderItemType.PRODUCT
				? productItemToDraftSelection(item)
				: bundleItemToDraftSelection(item),
	};
}

function productItemToDraftSelection(
	item: Extract<
		ParsedOrderDetailResponseDto["items"][number],
		{ type: OrderItemType.PRODUCT }
	>,
): DraftOrderSelectedProductItem {
	const firstAsset = item.assets[0];
	return {
		type: "PRODUCT",
		productTypeId: item.productTypeId,
		assetId: firstAsset?.id,
		quantity: item.assets.length || 1,
		label: item.name,
	};
}

function bundleItemToDraftSelection(
	item: Extract<
		ParsedOrderDetailResponseDto["items"][number],
		{ type: OrderItemType.BUNDLE }
	>,
): DraftOrderSelectedBundleItem {
	return {
		type: "BUNDLE",
		bundleId: item.bundleId,
		label: item.name,
	};
}
