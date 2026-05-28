import {
	type GetPendingReviewOrdersQueryDto,
	getPendingReviewOrdersQuerySchema,
} from "@repo/schemas";

export const pendingReviewOrdersSearchSchema =
	getPendingReviewOrdersQuerySchema;

export type PendingReviewOrdersSearch = GetPendingReviewOrdersQueryDto;
