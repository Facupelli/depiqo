import type { ListEquipmentTypesQueryDto } from "@repo/api-contracts";
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
import useDebounce from "@/shared/hooks/use-debounce";
import { AddUnitsDialog } from "../add-units/add-units-dialog";
import { EditEquipmentTypeDialog } from "../edit-equipment-type/edit-equipment-type-dialog";
import { EquipmentListTable } from "./equipment-list-table";
import { EquipmentListToolbar } from "./equipment-list-toolbar";
import {
	getListEquipmentTypesInputFromQueryKey,
	useListEquipmentTypes,
} from "./list-equipment-types.queries";

export type EquipmentTypesSearch = {
	page: number;
	pageSize: number;
	search?: string;
	categoryId?: string;
	branchId?: string;
	branchScope?: "all";
};

interface EquipmentTypesPageProps {
	search: EquipmentTypesSearch;
	onSearchChange: (
		updater: (previous: EquipmentTypesSearch) => EquipmentTypesSearch,
	) => void;
	onEquipmentTypeClick: (equipmentTypeId: string) => void;
}

export function EquipmentTypesPage({
	search,
	onSearchChange,
	onEquipmentTypeClick,
}: EquipmentTypesPageProps) {
	const navigate = useNavigate();
	const [searchInput, setSearchInput] = useState(search.search ?? "");
	const [editEquipmentTypeId, setEditEquipmentTypeId] = useState<string | null>(
		null,
	);
	const [addUnitEquipmentTypeId, setAddUnitEquipmentTypeId] = useState<
		string | null
	>(null);
	const debouncedSearch = useDebounce(searchInput, 300);
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches = [] } = useBranches();
	const { data: categories = [] } = useCategories();
	const activeCategories = categories.filter((category) => category.isActive);
	const effectiveBranchId = resolveEffectiveBranchId({
		branches,
		branchId: search.branchId,
		branchScope: search.branchScope,
		workingBranchId: currentAuth.workingBranchId,
	});
	const listInput = useMemo<ListEquipmentTypesQueryDto>(
		() => ({
			page: search.page,
			pageSize: search.pageSize,
			search: search.search,
			categoryId: search.categoryId,
			branchId: effectiveBranchId,
		}),
		[
			effectiveBranchId,
			search.categoryId,
			search.page,
			search.pageSize,
			search.search,
		],
	);
	const listQuery = useListEquipmentTypes(listInput, {
		placeholderData: (previousData, previousQuery) => {
			const previousInput = getListEquipmentTypesInputFromQueryKey(
				previousQuery?.queryKey ?? [],
			);

			return previousInput && previousInput.branchId === listInput.branchId
				? previousData
				: undefined;
		},
	});
	const pagination: PaginationState = {
		pageIndex: search.page - 1,
		pageSize: search.pageSize,
	};

	useEffect(() => {
		setSearchInput(search.search ?? "");
	}, [search.search]);

	useEffect(() => {
		const nextSearch = debouncedSearch.trim() || undefined;
		if (nextSearch === search.search) return;

		onSearchChange((previous) => ({
			...previous,
			search: nextSearch,
			page: 1,
		}));
	}, [debouncedSearch, onSearchChange, search.search]);

	useEffect(() => {
		if (!listQuery.isSuccess || !listQuery.data || listQuery.isPlaceholderData)
			return;

		const totalPages = Math.max(
			1,
			Math.ceil(listQuery.data.total / listQuery.data.pageSize),
		);
		if (search.page > totalPages && search.page > 1) {
			onSearchChange((previous) => ({ ...previous, page: totalPages }));
		}
	}, [
		listQuery.data,
		listQuery.isPlaceholderData,
		listQuery.isSuccess,
		onSearchChange,
		search.page,
	]);

	function handleFilterChange(filters: Partial<EquipmentTypesSearch>) {
		onSearchChange((previous) => ({
			...previous,
			...filters,
			page: 1,
		}));
	}

	function handleBranchChange(branch: BranchScopeFilter) {
		handleFilterChange({
			branchId: branch.type === "branch" ? branch.branchId : undefined,
			branchScope: branch.type === "all" ? "all" : undefined,
		});
	}

	function handlePaginationChange(nextPagination: PaginationState) {
		onSearchChange((previous) => ({
			...previous,
			page: nextPagination.pageIndex + 1,
			pageSize: nextPagination.pageSize,
		}));
	}

	function handleClearFilters() {
		setSearchInput("");
		onSearchChange((previous) => ({
			page: 1,
			pageSize: previous.pageSize,
		}));
	}

	return (
		<div className="space-y-4">
			<h1 className="sr-only">Equipos</h1>
			<div className="@container/equipment-index space-y-4">
				<EquipmentListToolbar
					filters={search}
					searchValue={searchInput}
					categories={activeCategories}
					branches={branches}
					inheritedBranchId={currentAuth.workingBranchId}
					showBranchFilter={branches.length !== 1}
					onSearchChange={setSearchInput}
					onFilterChange={handleFilterChange}
					onBranchChange={handleBranchChange}
					onClearFilters={handleClearFilters}
				/>

				<EquipmentListTable
					items={listQuery.data?.data ?? []}
					total={listQuery.data?.total ?? 0}
					pagination={pagination}
					onPaginationChange={handlePaginationChange}
					onRowClick={onEquipmentTypeClick}
					onEdit={setEditEquipmentTypeId}
					onAddUnit={setAddUnitEquipmentTypeId}
					showBranchStock={effectiveBranchId !== undefined}
					isLoading={listQuery.isLoading}
					isRefreshing={listQuery.isFetching && listQuery.isPlaceholderData}
					isError={listQuery.isError}
					emptyAction={
						<Button
							onClick={() =>
								navigate({ to: "/dashboard/inventory/equipment-types/new" })
							}
						>
							<Plus className="mr-2 size-4" />
							Nuevo equipo
						</Button>
					}
				/>
			</div>

			{editEquipmentTypeId ? (
				<EditEquipmentTypeDialog
					equipmentTypeId={editEquipmentTypeId}
					open
					onOpenChange={(open) => {
						if (!open) setEditEquipmentTypeId(null);
					}}
				/>
			) : null}
			{addUnitEquipmentTypeId ? (
				<AddUnitsDialog
					equipmentTypeId={addUnitEquipmentTypeId}
					open
					onOpenChange={(open) => {
						if (!open) setAddUnitEquipmentTypeId(null);
					}}
				/>
			) : null}
		</div>
	);
}
