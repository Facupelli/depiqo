import type { GetRentalsFulfillmentMethodDto } from "@repo/api-contracts";

export function getFulfillmentMethodLabel(
	fulfillmentMethod: GetRentalsFulfillmentMethodDto,
): "Delivery" | "Retiro" {
	return fulfillmentMethod === "DELIVERY" ? "Delivery" : "Retiro";
}
