import { type RentalProductSort, rentalProductSortSchema } from "@repo/schemas";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { startTransition, useCallback, useEffect } from "react";
import z from "zod";
import type { V2RentalPageSearch } from "@/routes/_portal/_tenant/v2/rental";
import { useStorefrontBranches } from "@/features/rental-commitment/branches/branches.queries";

export const rentalPageSearchSchema = z.object({
	locationId: z.string().optional(),
	pickupDate: z.iso.date().optional(),
	returnDate: z.iso.date().optional(),
	categoryId: z.string().optional(),
	search: z.string().optional(),
	sort: rentalProductSortSchema.default("price-desc").catch("price-desc"),
	page: z.coerce.number().default(1).catch(1),
	limit: z.coerce.number().optional(),
});

export type RentalPageSearch = z.infer<typeof rentalPageSearchSchema>;

export const DEFAULT_RENTAL_PRODUCT_SORT: RentalProductSort = "price-desc";

export function useRentalPageSearch() {
	const rawSearch = useSearch({ from: "/_portal/_tenant/v2/rental/" });
	const navigate = useNavigate({ from: "/v2/rental/" });

	const { data: branches } = useStorefrontBranches();

	const branchId = rawSearch.branchId ?? branches?.[0].id;

	// If locationId wasn't in the URL, write it in silently.
	// This runs client-side only — no SSR redirect, no stream hang.
	// useEffect is correct here: we're syncing derived state into an external
	// system (the URL) after render, not computing a value.
	useEffect(() => {
		if (!rawSearch.branchId && branchId) {
			navigate({
				search: (prev) => ({ ...prev, branchId }),
				replace: true,
				resetScroll: false,
			});
		}
	}, [rawSearch.branchId, branchId, navigate]);

	const search: V2RentalPageSearch = { ...rawSearch, branchId };

	const setUrlParam = useCallback(
		(patch: Partial<V2RentalPageSearch>) => {
			startTransition(() => {
				navigate({
					search: (prev) => ({ ...prev, ...patch }),
					resetScroll: false,
					replace: true,
				});
			});
		},
		[navigate],
	);

	function handleCategorySelect(id: string) {
		const next = search.categoryId === id ? undefined : id;
		setUrlParam({ categoryId: next, page: 1 });
	}

	function handleBranchChange(branchId: string) {
		setUrlParam({ branchId, page: 1 });
	}

	return {
		search,
		setUrlParam,
		handleCategorySelect,
		handleBranchChange,
	};
}
