import { GetStorefrontBranchSchedulesParamsSchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getStorefrontBranchSchedules } from "./get-storefront-branch-schedules.api";

const GetStorefrontBranchSchedulesInputSchema = z.object({
	params: GetStorefrontBranchSchedulesParamsSchema,
});

export const getStorefrontBranchSchedulesFn = createServerFn({
	method: "GET",
})
	.inputValidator((data) => GetStorefrontBranchSchedulesInputSchema.parse(data))
	.handler(async ({ data }) =>
		getStorefrontBranchSchedules(data.params.branchId),
	);
