import type { CreateDraftOrderDto, DeliveryRequestDto } from "@repo/schemas";
import { FulfillmentMethod } from "@repo/types";
import type {
	DraftOrderItem,
	DraftOrderState,
} from "@/features/orders/draft-order/types/draft-order.types";
import type { OrderEditorMode } from "@/features/orders/order-editor/types/order-editor.types";
import { getOrderEditorCopy } from "@/features/orders/order-editor/utils/order-editor-copy";

export function validateDraftOrderForSave({
	state,
	locationId,
	mode = "edit-draft",
}: {
	state: DraftOrderState;
	locationId: string | null;
	mode?: OrderEditorMode;
}): string | null {
	const copy = getOrderEditorCopy(mode);

	if (!locationId) {
		return copy.locationRequiredText;
	}

	if (
		!state.rentalPeriod.pickupDate ||
		!state.rentalPeriod.returnDate ||
		state.rentalPeriod.pickupTime === null ||
		state.rentalPeriod.returnTime === null
	) {
		return copy.periodRequiredText;
	}

	if (state.items.length === 0) {
		return copy.itemsRequiredText;
	}

	if (
		state.fulfillmentMethod === FulfillmentMethod.DELIVERY &&
		!isDeliveryRequestComplete(state.deliveryRequest)
	) {
		return copy.deliveryRequiredText;
	}

	return null;
}

export function buildCreateDraftOrderPayload({
	state,
	locationId,
}: {
	state: DraftOrderState;
	locationId: string;
}): CreateDraftOrderDto {
	return {
		customerId: state.customer?.id ?? null,
		locationId,
		pickupDate: state.rentalPeriod.pickupDate ?? "",
		returnDate: state.rentalPeriod.returnDate ?? "",
		pickupTime: state.rentalPeriod.pickupTime ?? 0,
		returnTime: state.rentalPeriod.returnTime ?? 0,
		currency: state.currency,
		insuranceSelected: false,
		initialPricingAdjustment: buildInitialPricingAdjustment(state),
		fulfillmentMethod: state.fulfillmentMethod,
		deliveryRequest: normalizeDeliveryRequest(
			state.fulfillmentMethod,
			state.deliveryRequest,
		),
		items: state.items.map((item) => toCreateDraftOrderItem(item)),
	};
}

function toCreateDraftOrderItem(
	item: DraftOrderItem,
): CreateDraftOrderDto["items"][number] {
	if (item.selection.type === "PRODUCT") {
		return {
			type: "PRODUCT",
			productTypeId: item.selection.productTypeId,
			assetId: item.selection.assetId,
			quantity: item.selection.quantity,
		};
	}

	return {
		type: "BUNDLE",
		bundleId: item.selection.bundleId,
	};
}

function buildInitialPricingAdjustment(
	state: DraftOrderState,
): CreateDraftOrderDto["initialPricingAdjustment"] {
	if (!state.budget) {
		return null;
	}

	return {
		mode: "TARGET_TOTAL",
		targetTotal: state.budget.targetTotal,
	};
}

function normalizeDeliveryRequest(
	fulfillmentMethod: FulfillmentMethod,
	deliveryRequest: DraftOrderState["deliveryRequest"],
): DeliveryRequestDto | null {
	if (fulfillmentMethod !== FulfillmentMethod.DELIVERY || !deliveryRequest) {
		return null;
	}

	return {
		recipientName: deliveryRequest.recipientName.trim(),
		phone: deliveryRequest.phone.trim(),
		addressLine1: deliveryRequest.addressLine1.trim(),
		addressLine2: deliveryRequest.addressLine2.trim() || null,
		city: deliveryRequest.city.trim(),
		stateRegion: deliveryRequest.stateRegion.trim(),
		postalCode: deliveryRequest.postalCode.trim(),
		country: deliveryRequest.country.trim(),
		instructions: deliveryRequest.instructions.trim() || null,
	};
}

function isDeliveryRequestComplete(
	deliveryRequest: DraftOrderState["deliveryRequest"],
): deliveryRequest is NonNullable<DraftOrderState["deliveryRequest"]> {
	if (!deliveryRequest) {
		return false;
	}

	return Boolean(
		deliveryRequest.recipientName.trim() &&
			deliveryRequest.phone.trim() &&
			deliveryRequest.addressLine1.trim() &&
			deliveryRequest.city.trim() &&
			deliveryRequest.stateRegion.trim() &&
			deliveryRequest.postalCode.trim() &&
			deliveryRequest.country.trim(),
	);
}
