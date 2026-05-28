import { FulfillmentMethod } from "@repo/types";
import { useReducer } from "react";
import type {
	DraftOrderBudgetState,
	DraftOrderCustomerRef,
	DraftOrderItem,
	DraftOrderSelectedBundleItem,
	DraftOrderSelectedProductItem,
	DraftOrderState,
} from "@/features/orders/draft-order/types/draft-order.types";
import {
	EMPTY_DRAFT_ORDER_DELIVERY_REQUEST,
	EMPTY_DRAFT_ORDER_RENTAL_PERIOD,
} from "@/features/orders/draft-order/types/draft-order.types";
import { normalizeMoneyAmount } from "@/features/orders/draft-order/utils/draft-order-pricing";

type DraftOrderAction =
	| { type: "set_customer"; customer: DraftOrderCustomerRef | null }
	| {
			type: "set_customer_field";
			field: keyof DraftOrderCustomerRef;
			value: string;
	  }
	| {
			type: "set_rental_period_field";
			field: keyof DraftOrderState["rentalPeriod"];
			value: string | number | null;
	  }
	| {
			type: "set_fulfillment_method";
			fulfillmentMethod: FulfillmentMethod;
	  }
	| {
			type: "set_delivery_request_field";
			field: keyof NonNullable<DraftOrderState["deliveryRequest"]>;
			value: string;
	  }
	| {
			type: "add_item";
			item: DraftOrderItem;
	  }
	| {
			type: "upsert_product_item";
			item: DraftOrderItem;
	  }
	| {
			type: "set_product_quantity";
			draftItemId: string;
			quantity: number;
	  }
	| { type: "remove_item"; draftItemId: string }
	| {
			type: "set_budget_target_total";
			targetTotal: string | null;
	  }
	| { type: "reset" }
	| { type: "initialize_from_order"; state: DraftOrderState };

export function createInitialDraftOrderState(): DraftOrderState {
	return {
		currency: "USD",
		customer: null,
		rentalPeriod: EMPTY_DRAFT_ORDER_RENTAL_PERIOD,
		fulfillmentMethod: FulfillmentMethod.PICKUP,
		deliveryRequest: null,
		items: [],
		budget: null,
	};
}

function draftOrderReducer(
	state: DraftOrderState,
	action: DraftOrderAction,
): DraftOrderState {
	switch (action.type) {
		case "set_customer":
			return { ...state, customer: action.customer };

		case "set_customer_field":
			return {
				...state,
				customer: {
					id: state.customer?.id ?? crypto.randomUUID(),
					displayName: state.customer?.displayName ?? "",
					[action.field]: action.value,
				},
			};

		case "set_rental_period_field":
			return {
				...state,
				rentalPeriod: {
					...state.rentalPeriod,
					[action.field]: action.value,
				},
			};

		case "set_fulfillment_method":
			return action.fulfillmentMethod === FulfillmentMethod.PICKUP
				? {
						...state,
						fulfillmentMethod: action.fulfillmentMethod,
						deliveryRequest: null,
					}
				: {
						...state,
						fulfillmentMethod: action.fulfillmentMethod,
						deliveryRequest:
							state.deliveryRequest ?? EMPTY_DRAFT_ORDER_DELIVERY_REQUEST,
					};

		case "set_delivery_request_field":
			return {
				...state,
				deliveryRequest: {
					...(state.deliveryRequest ?? EMPTY_DRAFT_ORDER_DELIVERY_REQUEST),
					[action.field]: action.value,
				},
			};

		case "add_item":
			return {
				...state,
				items: [...state.items, action.item],
			};

		case "upsert_product_item": {
			const existingIndex = state.items.findIndex(
				(item) =>
					item.selection.type === "PRODUCT" &&
					action.item.selection.type === "PRODUCT" &&
					item.selection.productTypeId === action.item.selection.productTypeId,
			);

			if (existingIndex === -1) {
				return {
					...state,
					items: [...state.items, action.item],
				};
			}

			return {
				...state,
				items: state.items.map((item, index) =>
					index === existingIndex
						? {
								...action.item,
								draftItemId: item.draftItemId,
							}
						: item,
				),
			};
		}

		case "set_product_quantity":
			return {
				...state,
				items: state.items.map((item) =>
					item.draftItemId === action.draftItemId &&
					item.selection.type === "PRODUCT"
						? {
								...item,
								selection: {
									...item.selection,
									quantity: action.quantity,
								},
							}
						: item,
				),
			};

		case "remove_item":
			return {
				...state,
				items: state.items.filter(
					(item) => item.draftItemId !== action.draftItemId,
				),
			};

		case "set_budget_target_total": {
			const normalizedTargetTotal =
				action.targetTotal === null
					? null
					: normalizeMoneyAmount(action.targetTotal);

			if (action.targetTotal !== null && normalizedTargetTotal === null) {
				return state;
			}

			return {
				...state,
				budget:
					normalizedTargetTotal === null
						? null
						: ({ targetTotal: normalizedTargetTotal } as DraftOrderBudgetState),
			};
		}

		case "reset":
			return createInitialDraftOrderState();

		case "initialize_from_order":
			return action.state;

		default:
			return state;
	}
}

function createDraftItem(
	selection: DraftOrderSelectedProductItem | DraftOrderSelectedBundleItem,
): DraftOrderItem {
	return {
		draftItemId: crypto.randomUUID(),
		selection,
	};
}

export function useDraftOrder(initialOrder?: DraftOrderState | null) {
	const [state, dispatch] = useReducer(
		draftOrderReducer,
		initialOrder ?? undefined,
		initialOrder ? () => initialOrder : createInitialDraftOrderState,
	);
	return {
		state,
		derived: {
			hasCustomer: Boolean(state.customer),
			hasRentalPeriod: Boolean(
				state.rentalPeriod.pickupDate &&
					state.rentalPeriod.returnDate &&
					state.rentalPeriod.pickupTime !== null &&
					state.rentalPeriod.returnTime !== null,
			),
			hasItems: state.items.length > 0,
		},
		actions: {
			setCustomer: (customer: DraftOrderCustomerRef | null) =>
				dispatch({ type: "set_customer", customer }),
			setCustomerField: (field: keyof DraftOrderCustomerRef, value: string) =>
				dispatch({ type: "set_customer_field", field, value }),
			setRentalPeriodField: (
				field: keyof DraftOrderState["rentalPeriod"],
				value: string | number | null,
			) => dispatch({ type: "set_rental_period_field", field, value }),
			setFulfillmentMethod: (fulfillmentMethod: FulfillmentMethod) =>
				dispatch({
					type: "set_fulfillment_method",
					fulfillmentMethod,
				}),
			setDeliveryRequestField: (
				field: keyof NonNullable<DraftOrderState["deliveryRequest"]>,
				value: string,
			) => dispatch({ type: "set_delivery_request_field", field, value }),
			addProductItem: (selection: DraftOrderSelectedProductItem) =>
				dispatch({
					type: "upsert_product_item",
					item: createDraftItem(selection),
				}),
			addBundleItem: (selection: DraftOrderSelectedBundleItem) =>
				dispatch({
					type: "add_item",
					item: createDraftItem(selection),
				}),
			setProductQuantity: (draftItemId: string, quantity: number) =>
				dispatch({ type: "set_product_quantity", draftItemId, quantity }),
			removeItem: (draftItemId: string) =>
				dispatch({ type: "remove_item", draftItemId }),
			setBudgetTargetTotal: (targetTotal: string | null) =>
				dispatch({ type: "set_budget_target_total", targetTotal }),
			resetDraft: () => dispatch({ type: "reset" }),
		},
	};
}
