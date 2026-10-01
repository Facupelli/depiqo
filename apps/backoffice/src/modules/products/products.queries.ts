import {
	type GetRentableItemsQueryDto,
	GetRentableItemsQuerySchema,
} from "@repo/api-contracts";

export function normalizeProductListQuery(
	query?: GetRentableItemsQueryDto,
): GetRentableItemsQueryDto {
	const parsed = GetRentableItemsQuerySchema.parse(query ?? {});

	return {
		...(parsed.search ? { search: parsed.search } : {}),
		...(parsed.kinds
			? { kinds: Array.from(new Set(parsed.kinds)).sort() }
			: {}),
		...(parsed.archived === undefined ? {} : { archived: parsed.archived }),
		...(parsed.categoryId ? { categoryId: parsed.categoryId } : {}),
		...(parsed.branchId ? { branchId: parsed.branchId } : {}),
		...(parsed.showInStore === undefined
			? {}
			: { showInStore: parsed.showInStore }),
		...(parsed.isRentable === undefined
			? {}
			: { isRentable: parsed.isRentable }),
		...(parsed.hasActivePricing === undefined
			? {}
			: { hasActivePricing: parsed.hasActivePricing }),
		page: parsed.page,
		pageSize: parsed.pageSize,
	};
}

export const productKeys = {
	all: () => ["v2", "catalog", "rentable-items"] as const,
	lists: () => [...productKeys.all(), "list"] as const,
	list: (query?: GetRentableItemsQueryDto) =>
		[...productKeys.lists(), normalizeProductListQuery(query)] as const,
	details: () => [...productKeys.all(), "detail"] as const,
	detail: (rentableItemId?: string) =>
		[...productKeys.details(), rentableItemId] as const,
};
