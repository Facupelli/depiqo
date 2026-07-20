import {
	GetStorefrontBranchScheduleSlotsParamsSchema,
	GetStorefrontBranchScheduleSlotsQuerySchema,
} from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getStorefrontBranchScheduleSlots } from "./get-storefront-branch-schedule-slots.api";

const GetStorefrontBranchScheduleSlotsInputSchema = z.object({
	params: GetStorefrontBranchScheduleSlotsParamsSchema,
	query: GetStorefrontBranchScheduleSlotsQuerySchema,
});

export const getStorefrontBranchScheduleSlotsFn = createServerFn({
	method: "GET",
})
	.validator((data) =>
		GetStorefrontBranchScheduleSlotsInputSchema.parse(data),
	)
	.handler(async ({ data }) =>
		getStorefrontBranchScheduleSlots(data.params.branchId, data.query),
	);
