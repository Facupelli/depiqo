import {
	getPendingReviewOrdersQuerySchema,
	type GetPendingReviewOrdersQueryDto,
} from "@repo/schemas";

export const pendingReviewOrdersSearchSchema = getPendingReviewOrdersQuerySchema;

export type PendingReviewOrdersSearch = GetPendingReviewOrdersQueryDto;
