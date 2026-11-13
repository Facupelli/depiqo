import type { GetRentalsFulfillmentMethodDto } from "@repo/api-contracts";

export function getFulfillmentMethodLabel(
	fulfillmentMethod: GetRentalsFulfillmentMethodDto,
): "Envío" | "Retiro" {
	return fulfillmentMethod === "DELIVERY" ? "Envío" : "Retiro";
}
