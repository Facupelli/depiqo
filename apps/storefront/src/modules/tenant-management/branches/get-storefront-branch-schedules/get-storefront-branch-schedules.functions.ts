import { GetStorefrontBranchSchedulesParamsSchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { getStorefrontBranchSchedules } from "./get-storefront-branch-schedules.api";

const GetStorefrontBranchSchedulesInputSchema = z.object({
	params: GetStorefrontBranchSchedulesParamsSchema,
});

export const getStorefrontBranchSchedulesFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.validator((data) => GetStorefrontBranchSchedulesInputSchema.parse(data))
	.handler(async ({ data, context }) =>
		getStorefrontBranchSchedules(
			context.storefrontRequest,
			data.params.branchId,
		),
	);
