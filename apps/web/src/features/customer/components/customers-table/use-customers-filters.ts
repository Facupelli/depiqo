import type { GetCustomersQueryDto } from "@repo/schemas";
import type { OnboardingStatus } from "@repo/types";
import { useState } from "react";
import useDebounce from "@/shared/hooks/use-debounce";

type FiltersState = {
	page: number;
	limit: number;
	search: string;
	onboardingStatus: OnboardingStatus | null;
	isActive: boolean | null;
	isCompany: boolean | null;
};

const DEFAULT_FILTERS: FiltersState = {
	page: 1,
	limit: 20,
	search: "",
	onboardingStatus: null,
	isActive: null,
	isCompany: null,
};

export function useCustomersFilters() {
	const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

	const debouncedSearch = useDebounce(filters.search, 300);

	const queryParams: GetCustomersQueryDto = {
		page: filters.page,
		limit: filters.limit,
		search: debouncedSearch.trim() || null,
		onboardingStatus: filters.onboardingStatus,
		isActive: filters.isActive,
		isCompany: filters.isCompany,
	};

	// Resetting the page to 1 whenever a filter changes is intentional:
	// staying on page 5 after narrowing results would often show an empty page.
	const setSearch = (value: string) => {
		setFilters((prev) => ({ ...prev, search: value, page: 1 }));
	};

	const setOnboardingStatus = (value: OnboardingStatus | null) => {
		setFilters((prev) => ({ ...prev, onboardingStatus: value, page: 1 }));
	};

	const setIsActive = (value: boolean | null) => {
		setFilters((prev) => ({ ...prev, isActive: value, page: 1 }));
	};

	const setIsCompany = (value: boolean | null) => {
		setFilters((prev) => ({ ...prev, isCompany: value, page: 1 }));
	};

	const setPage = (page: number) => {
		setFilters((prev) => ({ ...prev, page }));
	};

	const resetFilters = () => {
		setFilters(DEFAULT_FILTERS);
	};

	const hasActiveFilters =
		filters.search !== "" ||
		filters.onboardingStatus !== null ||
		filters.isActive !== null ||
		filters.isCompany !== null;

	return {
		filters,
		queryParams,
		hasActiveFilters,
		setSearch,
		setOnboardingStatus,
		setIsActive,
		setIsCompany,
		setPage,
		resetFilters,
	};
}
