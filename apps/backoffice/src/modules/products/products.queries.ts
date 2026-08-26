import type { GetRentableItemsQueryDto } from "@repo/api-contracts";

export const productKeys = {
	all: () => ["v2", "catalog", "rentable-items"] as const,
	lists: () => [...productKeys.all(), "list"] as const,
	list: (query?: GetRentableItemsQueryDto) =>
		[...productKeys.lists(), query ?? {}] as const,
	details: () => [...productKeys.all(), "detail"] as const,
	detail: (rentableItemId?: string) =>
		[...productKeys.details(), rentableItemId] as const,
};
