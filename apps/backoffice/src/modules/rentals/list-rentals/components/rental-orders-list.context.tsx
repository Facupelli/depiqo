import type {
	GetBranchesResponseDto,
	GetRentalsDateLensDto,
	GetRentalsQueryDto,
	GetRentalsSortByDto,
	GetRentalsSortDirectionDto,
	GetRentalsStatusDto,
} from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { resolveEffectiveBranchId } from "@/application/branch-scope/resolve-effective-branch-id";
import { useCurrentBusiness } from "@/application/current-business/current-business.queries";
import { currentAuthQueries } from "@/auth/auth.queries";
import {
	getRentalListInputFromQueryKey,
	type ParsedRentalListItem,
	useRentals,
} from "@/modules/rentals/rental.queries";
import { RENTAL_ORDER_STATUS_OPTIONS } from "@/modules/rentals/shared/rental-order-status";
import { useBranches } from "@/modules/settings/branches/public";
import { resolveOperationalTimezone } from "@/shared/timezone/operational-timezone";

export type RentalOrdersListSearch = GetRentalsQueryDto & {
	branchScope?: "all";
};
export type RentalOrdersListSort = {
	sortBy: GetRentalsSortByDto;
	sortDirection: GetRentalsSortDirectionDto;
};

type RentalOrdersListContextValue = {
	search: RentalOrdersListSearch;
	effectiveRequest: GetRentalsQueryDto;
	rentals: ParsedRentalListItem[];
	branches: GetBranchesResponseDto;
	meta: { total: number; totalPages: number };
	isLoading: boolean;
	isBranchesLoading: boolean;
	isRefreshing: boolean;
	isError: boolean;
	hasActiveFilters: boolean;
	inheritedBranchId: string | null;
	getBranchName: (branchId: string) => string | undefined;
	getOperationalTimezone: (branchId: string) => string;
	setDateLens: (dateLens?: GetRentalsDateLensDto) => void;
	setStatuses: (statuses?: GetRentalsStatusDto[]) => void;
	setBranch: (filter: BranchScopeFilter) => void;
	resetFilters: () => void;
	setPage: (page: number) => void;
	setSort: (
		sortBy: GetRentalsSortByDto,
		nextDirection?: GetRentalsSortDirectionDto,
	) => void;
	openRentalOrder: (rental: ParsedRentalListItem) => void;
};

const RentalOrdersListContext = createContext<
	RentalOrdersListContextValue | undefined
>(undefined);

export function RentalOrdersListProvider({
	children,
	search,
	onSearchChange,
}: {
	children: ReactNode;
	search: RentalOrdersListSearch;
	onSearchChange: (
		updater: (previous: RentalOrdersListSearch) => RentalOrdersListSearch,
	) => void;
}) {
	const value = useRentalOrdersListPage(search, onSearchChange);

	return (
		<RentalOrdersListContext.Provider value={value}>
			{children}
		</RentalOrdersListContext.Provider>
	);
}

export function useRentalOrdersList() {
	const context = useContext(RentalOrdersListContext);

	if (!context) {
		throw new Error(
			"useRentalOrdersList must be used within RentalOrdersListProvider.",
		);
	}

	return context;
}

function useRentalOrdersListPage(
	search: RentalOrdersListSearch,
	onSearchChange: (
		updater: (previous: RentalOrdersListSearch) => RentalOrdersListSearch,
	) => void,
): RentalOrdersListContextValue {
	const navigate = useNavigate();
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
	const { branchScope: _branchScope, ...backendSearch } = search;
	const effectiveBranchId = resolveEffectiveBranchId({
		branches,
		branchId: search.branchId,
		branchScope: search.branchScope,
		workingBranchId: currentAuth.workingBranchId,
	});
	const effectiveRequest: GetRentalsQueryDto = {
		...backendSearch,
		branchId: effectiveBranchId,
	};
	const { data, isLoading, isError, isFetching, isPlaceholderData } =
		useRentals(effectiveRequest, {
			placeholderData: (previousData, previousQuery) => {
				const previousInput = getRentalListInputFromQueryKey(
					previousQuery?.queryKey ?? [],
				);

				return previousInput &&
					isSameRentalListContext(previousInput, effectiveRequest)
					? previousData
					: undefined;
			},
		});
	const { data: business } = useCurrentBusiness();

	const rentals = data?.data ?? [];
	const meta = {
		total: data?.total ?? 0,
		totalPages: data ? Math.max(1, Math.ceil(data.total / search.limit)) : 1,
	};
	const hasActiveFilters = hasActiveRentalOrdersFilters(
		search,
		branches.length !== 1,
	);

	function updateSearch(
		updater: (previous: RentalOrdersListSearch) => RentalOrdersListSearch,
	) {
		onSearchChange(updater);
	}

	function resetToFirstPage(
		prev: RentalOrdersListSearch,
	): RentalOrdersListSearch {
		return { ...prev, page: 1 };
	}

	function clearExplicitSort(
		prev: RentalOrdersListSearch,
	): RentalOrdersListSearch {
		return { ...prev, sortBy: undefined, sortDirection: undefined };
	}

	return {
		search,
		effectiveRequest,
		rentals,
		branches,
		meta,
		isLoading,
		isBranchesLoading,
		isRefreshing: isFetching && isPlaceholderData,
		isError,
		hasActiveFilters,
		inheritedBranchId: currentAuth.workingBranchId,
		getBranchName: (branchId: string) =>
			branches.find((branch) => branch.id === branchId)?.name,
		getOperationalTimezone: (branchId: string) =>
			resolveOperationalTimezone({
				branchTimezone: branches.find((branch) => branch.id === branchId)
					?.timezone,
				tenantTimezone: business?.config.timezone,
			}),
		setDateLens: (dateLens?: GetRentalsDateLensDto) =>
			updateSearch((prev) => {
				const next = resetToFirstPage({ ...prev, dateLens });
				return hasExplicitRentalOrdersSort(prev)
					? next
					: clearExplicitSort(next);
			}),
		setStatuses: (statuses?: GetRentalsStatusDto[]) =>
			updateSearch((prev) => resetToFirstPage({ ...prev, statuses })),
		setBranch: (filter: BranchScopeFilter) =>
			updateSearch((prev) => {
				const next: RentalOrdersListSearch = {
					...prev,
					branchId: filter.type === "branch" ? filter.branchId : undefined,
					branchScope: filter.type === "all" ? "all" : undefined,
				};

				return resetToFirstPage(next);
			}),
		resetFilters: () =>
			updateSearch((prev) => ({
				...prev,
				page: 1,
				limit: prev.limit,
				branchId: undefined,
				branchScope: undefined,
				customerId: undefined,
				statuses: undefined,
				dateLens: undefined,
				sortBy: undefined,
				sortDirection: undefined,
			})),
		setPage: (page: number) => updateSearch((prev) => ({ ...prev, page })),
		setSort: (
			sortBy: GetRentalsSortByDto,
			nextDirection?: GetRentalsSortDirectionDto,
		) =>
			updateSearch((prev) => ({
				...resetToFirstPage(prev),
				sortBy: nextDirection ? sortBy : undefined,
				sortDirection: nextDirection,
			})),
		openRentalOrder: (rental: ParsedRentalListItem) =>
			navigate({
				to: "/dashboard/orders/$orderId",
				params: { orderId: rental.id },
			}),
	};
}

function isSameRentalListContext(
	previous: RentalOrdersListSearch,
	current: RentalOrdersListSearch,
): boolean {
	return (
		previous.branchId === current.branchId &&
		previous.customerId === current.customerId &&
		haveSameRentalStatuses(previous.statuses, current.statuses) &&
		previous.dateLens === current.dateLens
	);
}

function haveSameRentalStatuses(
	previous: GetRentalsStatusDto[] | undefined,
	current: GetRentalsStatusDto[] | undefined,
): boolean {
	const normalizedPrevious = normalizeRentalStatuses(previous);
	const normalizedCurrent = normalizeRentalStatuses(current);

	return (
		normalizedPrevious.length === normalizedCurrent.length &&
		normalizedPrevious.every(
			(status, index) => status === normalizedCurrent[index],
		)
	);
}

function normalizeRentalStatuses(
	statuses: GetRentalsStatusDto[] | undefined,
): readonly GetRentalsStatusDto[] {
	if (!statuses) return RENTAL_ORDER_STATUS_OPTIONS;

	return RENTAL_ORDER_STATUS_OPTIONS.filter((status) =>
		statuses.includes(status),
	);
}

export function hasExplicitRentalOrdersSort(
	search: RentalOrdersListSearch,
): boolean {
	return Boolean(search.sortBy || search.sortDirection);
}

export function hasActiveRentalOrdersFilters(
	search: RentalOrdersListSearch,
	branchFilteringEnabled: boolean,
): boolean {
	return Boolean(
		search.dateLens ||
			(branchFilteringEnabled &&
				(search.branchId || search.branchScope === "all")) ||
			search.customerId ||
			search.statuses?.length ||
			hasExplicitRentalOrdersSort(search),
	);
}

export function getDefaultRentalOrdersSort(
	dateLens?: GetRentalsDateLensDto,
): RentalOrdersListSort {
	switch (dateLens) {
		case "UPCOMING":
			return { sortBy: "pickupDate", sortDirection: "asc" };
		case "ACTIVE":
			return { sortBy: "returnDate", sortDirection: "asc" };
		case "PAST":
			return { sortBy: "returnDate", sortDirection: "desc" };
		default:
			return { sortBy: "createdAt", sortDirection: "desc" };
	}
}

export function getEffectiveRentalOrdersSort(
	search: RentalOrdersListSearch,
): RentalOrdersListSort {
	const fallback = getDefaultRentalOrdersSort(search.dateLens);

	if (!search.sortBy && !search.sortDirection) {
		return fallback;
	}

	return {
		sortBy: search.sortBy ?? fallback.sortBy,
		sortDirection: search.sortDirection ?? fallback.sortDirection,
	};
}
