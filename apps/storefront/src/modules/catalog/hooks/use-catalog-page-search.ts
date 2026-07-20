import { useNavigate } from "@tanstack/react-router";
import { startTransition, useCallback } from "react";
import type { RentalCatalogSearch } from "@/modules/catalog/rental-catalog-search";

export function useRentalPageSearch(search: RentalCatalogSearch) {
	const navigate = useNavigate({ from: "/rental/" });

	const setUrlParam = useCallback(
		(patch: Partial<RentalCatalogSearch>) => {
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
