import type { GetRentalCustomersQueryDto } from "@repo/api-contracts";

export const customerKeys = {
	all: () => ["v2", "tenant-management", "rental-customers"] as const,
	lists: () => [...customerKeys.all(), "list"] as const,
	list: (query?: GetRentalCustomersQueryDto) =>
		[...customerKeys.lists(), query ?? {}] as const,
	details: () => [...customerKeys.all(), "detail"] as const,
	profileDetail: (customerId?: string) =>
		[...customerKeys.details(), customerId, "profile"] as const,
};
