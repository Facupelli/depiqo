import type { ExternalOwnerEntry } from "@/features/orders/order.utils";
import type { ParsedOrderDetailResponseDto } from "@/features/orders/queries/get-order-by-id";

export type OrderDetailItem = ParsedOrderDetailResponseDto["items"][number];
export type ProductOrderDetailItem = Extract<OrderDetailItem, { type: "PRODUCT" }>;

export type TimelineStep = {
	label: string;
	state: "completed" | "current" | "pending";
};

export type StepKey = "confirm" | "accessories" | "signing" | "pickup" | "return";

export type GroupedOrderItem = {
	key: string;
	type: OrderDetailItem["type"];
	name: string;
	imageUrl: string | null;
	quantity: number;
	serialGroups: SerialNumberGroup[];
	bundleSummary: string | null;
	productOwner: string | null;
	bundleExternalOwners: ExternalOwnerEntry[];
	savedAccessories: ProductOrderDetailItem["accessories"];
};

export type SerialNumberGroup = {
	label: string | null;
	serialNumbers: string[];
};
