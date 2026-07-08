import { useNavigate, useSearch } from "@tanstack/react-router";
import { startTransition, useCallback, useEffect } from "react";
import { useStorefrontBranches } from "@/features/rental-commitment/branches/branches.queries";
import type { V2RentalPageSearch } from "@/routes/_portal/_tenant/rental";

export function useRentalPageSearch() {
	const rawSearch = useSearch({ from: "/_portal/_tenant/rental/" });
	const navigate = useNavigate({ from: "/rental/" });

	const { data: branches } = useStorefrontBranches();

	const branchId = rawSearch.branchId ?? branches?.[0].id;

	// If branchId wasn't in the URL, write it in silently.
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
