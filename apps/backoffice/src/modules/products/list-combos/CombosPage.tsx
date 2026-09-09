import type {
	GetRentableItemsItemDto,
	GetRentableItemsQueryDto,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { PaginationState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { resolveEffectiveBranchId } from "@/application/branch-scope/resolve-effective-branch-id";
import { currentAuthQueries } from "@/auth/auth.queries";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import { ArchiveProductAction } from "../archive-product/ArchiveProductAction";
import {
	getProductListInputFromQueryKey,
	useProducts,
} from "../rentable-item-list/rentable-item-list.queries";
import { ComboListTable } from "./combo-list-table";
import { ComboListToolbar, type SearchCommit } from "./combo-list-toolbar";

const COMBO_KINDS = ["PACKAGE", "KIT", "BUNDLE"] as const;

export type CombosSearch = {
	page: number;
	pageSize: number;
	search?: string;
	status: "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED";
	categoryId?: string;
	branchId?: string;
	branchScope?: "all";
};

export function CombosPage({ search }: { search: CombosSearch }) {
	const navigate = useNavigate({ from: "/dashboard/catalog/packages/" });
	const [archiveItem, setArchiveItem] =
		useState<GetRentableItemsItemDto | null>(null);
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches = [] } = useBranches();
	const { data: categories = [] } = useCategories();
	const effectiveBranchId = resolveEffectiveBranchId({
		branches,
		branchId: search.branchId,
		branchScope: search.branchScope,
		workingBranchId: currentAuth.workingBranchId,
	});
	const listInput = useMemo<GetRentableItemsQueryDto>(
		() => ({
			page: search.page,
			pageSize: search.pageSize,
			search: search.search,
			status: search.status === "ALL" ? undefined : search.status,
			categoryId: search.categoryId,
			branchId: effectiveBranchId,
			kinds: [...COMBO_KINDS],
		}),
		[
			effectiveBranchId,
			search.categoryId,
			search.page,
			search.pageSize,
			search.search,
			search.status,
		],
	);
	const listQuery = useProducts(listInput, {
		placeholderData: (previousData, previousQuery) => {
			const previousInput = getProductListInputFromQueryKey(
				previousQuery?.queryKey ?? [],
			);
			return previousInput && previousInput.branchId === listInput.branchId
				? previousData
				: undefined;
		},
	});
	const hasExplicitNarrowingFilters = Boolean(
		search.search ||
			search.categoryId ||
			search.branchId ||
			search.status === "DRAFT" ||
			search.status === "ARCHIVED",
	);
	const hasZeroCurrentResults =
		listQuery.isSuccess &&
		!listQuery.isPlaceholderData &&
		listQuery.data.total === 0;
	const needsTenantComboVerification =
		hasZeroCurrentResults &&
		!hasExplicitNarrowingFilters &&
		(search.status === "ACTIVE" || Boolean(effectiveBranchId));
	const tenantComboCountQuery = useProducts(
		{ kinds: [...COMBO_KINDS], page: 1, pageSize: 1 },
		{
			enabled: needsTenantComboVerification,
			select: (result) => result.total,
		},
	);
	const categoryNameById = useMemo(
		() => new Map(categories.map((category) => [category.id, category.name])),
		[categories],
	);
	const pagination: PaginationState = {
		pageIndex: search.page - 1,
		pageSize: search.pageSize,
	};
	const isFilteredEmpty =
		hasExplicitNarrowingFilters ||
		(needsTenantComboVerification &&
			tenantComboCountQuery.isSuccess &&
			tenantComboCountQuery.data > 0);
	const isVerifyingFirstUse =
		needsTenantComboVerification && tenantComboCountQuery.isPending;
	const isVerificationError =
		needsTenantComboVerification && tenantComboCountQuery.isError;
	useEffect(() => {
		if (!listQuery.isSuccess || !listQuery.data || listQuery.isPlaceholderData)
			return;
		const totalPages = Math.max(
			1,
			Math.ceil(listQuery.data.total / listQuery.data.pageSize),
		);
		if (search.page > totalPages && search.page > 1)
			navigate({
				search: (previous) => ({ ...previous, page: totalPages }),
				replace: true,
			});
	}, [
		listQuery.data,
		listQuery.isPlaceholderData,
		listQuery.isSuccess,
		navigate,
		search.page,
	]);

	function handleSearchCommit({ value, basedOnAppliedValue }: SearchCommit) {
		const currentAppliedValue = search.search ?? "";
		if (currentAppliedValue !== basedOnAppliedValue) return;

		const nextSearch = value.trim() || undefined;
		if (nextSearch === search.search) return;
		navigate({
			search: (previous) => ({ ...previous, search: nextSearch, page: 1 }),
			replace: true,
		});
	}
	function handleFilterChange(filters: Partial<CombosSearch>) {
		navigate({
			search: (previous) => ({ ...previous, ...filters, page: 1 }),
			replace: true,
		});
	}
	function handleBranchChange(branch: BranchScopeFilter) {
		handleFilterChange({
			branchId: branch.type === "branch" ? branch.branchId : undefined,
			branchScope: branch.type === "all" ? "all" : undefined,
		});
	}
	function handlePaginationChange(next: PaginationState) {
		navigate({
			search: (previous) => ({
				...previous,
				page: next.pageIndex + 1,
				pageSize: next.pageSize,
			}),
			replace: true,
		});
	}
	function handleClearFilters() {
		navigate({
			search: (previous) => ({ page: 1, pageSize: previous.pageSize }),
			replace: true,
		});
	}
	const emptyAction = (
		<Button onClick={() => navigate({ to: "/dashboard/catalog/packages/new" })}>
			<Plus className="mr-2 size-4" />
			Nuevo combo
		</Button>
	);

	return (
		<div className="space-y-4">
			<h1 className="sr-only">Combos</h1>
			<div className="@container/combo-index space-y-4">
				<ComboListToolbar
					filters={search}
					appliedSearchValue={search.search ?? ""}
					categories={categories.filter((category) => category.isActive)}
					branches={branches}
					inheritedBranchId={currentAuth.workingBranchId}
					showBranchFilter={branches.length !== 1}
					onSearchCommit={handleSearchCommit}
					onFilterChange={handleFilterChange}
					onBranchChange={handleBranchChange}
					onClearFilters={handleClearFilters}
				/>
				<ComboListTable
					items={listQuery.data?.data ?? []}
					total={listQuery.data?.total ?? 0}
					pagination={pagination}
					categoryNameById={categoryNameById}
					onPaginationChange={handlePaginationChange}
					onRowClick={(rentableItemId) =>
						navigate({
							to: "/dashboard/catalog/$rentableItemId",
							params: { rentableItemId },
						})
					}
					onArchive={setArchiveItem}
					onRetry={() =>
						isVerificationError
							? tenantComboCountQuery.refetch()
							: listQuery.refetch()
					}
					isLoading={listQuery.isLoading || isVerifyingFirstUse}
					isRefreshing={listQuery.isFetching && listQuery.isPlaceholderData}
					isError={listQuery.isError || isVerificationError}
					isFiltered={isFilteredEmpty}
					emptyAction={emptyAction}
				/>
			</div>
			{archiveItem ? (
				<ArchiveProductAction
					rentableItemId={archiveItem.id}
					terminology="combo"
					open
					onOpenChange={(open) => {
						if (!open) setArchiveItem(null);
					}}
				/>
			) : null}
		</div>
	);
}
