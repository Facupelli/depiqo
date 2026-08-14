import {
	GetStorefrontBranchScheduleSlotsParamsSchema,
	GetStorefrontBranchScheduleSlotsQuerySchema,
} from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { getStorefrontBranchScheduleSlots } from "./get-storefront-branch-schedule-slots.api";

const GetStorefrontBranchScheduleSlotsInputSchema = z.object({
	params: GetStorefrontBranchScheduleSlotsParamsSchema,
	query: GetStorefrontBranchScheduleSlotsQuerySchema,
});

export const getStorefrontBranchScheduleSlotsFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) =>
		GetStorefrontBranchScheduleSlotsInputSchema.parse(data),
	)
	.handler(async ({ data, context }) =>
		getStorefrontBranchScheduleSlots(
			context.storefrontRequest,
			data.params.branchId,
			data.query,
		),
	);
