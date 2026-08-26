import { z } from "zod";

export const rentalCatalogSearchDefaults = {
	page: 1,
	pageSize: 20,
} as const;

export const rentalCatalogSearchSchema = z.object({
	branchId: z
		.string()
		.trim()
		.optional()
		.transform((value) => value || undefined),
	page: z.coerce
		.number()
		.int()
		.positive()
		.default(rentalCatalogSearchDefaults.page),
	pageSize: z.coerce
		.number()
		.int()
		.positive()
		.max(100)
		.default(rentalCatalogSearchDefaults.pageSize),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	categoryId: z.string().optional(),
	search: z.string().optional(),
});

export type RentalRouteSearch = z.infer<typeof rentalCatalogSearchSchema>;

export type RentalCatalogSearch = Omit<RentalRouteSearch, "branchId"> & {
	branchId: string;
};
