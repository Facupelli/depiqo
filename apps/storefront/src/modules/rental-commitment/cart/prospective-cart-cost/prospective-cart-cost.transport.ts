import {
	type ProspectiveCartCostBodyDto,
	ProspectiveCartCostBodySchema,
} from "@repo/api-contracts";

export function parseProspectiveCartCostTransportBody(
	body: unknown,
): ProspectiveCartCostBodyDto {
	return ProspectiveCartCostBodySchema.parse(body);
}
