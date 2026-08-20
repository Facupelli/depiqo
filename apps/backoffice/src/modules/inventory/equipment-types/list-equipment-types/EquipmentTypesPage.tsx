import type { GetEquipmentTypeSummariesItemDto } from "@repo/api-contracts";
import type { PaginationState } from "@tanstack/react-table";
import { startTransition, useEffect, useState } from "react";
import { useBranches } from "@/modules/settings/branches/public";
import useDebounce from "@/shared/hooks/use-debounce";
import { CreateEquipmentTypeDialog } from "../create-equipment-type/create-equipment-type-dialog";
import { useEquipmentTypeProductUsages } from "./equipment-type-product-usages.queries";
import { useEquipmentTypeSummaries } from "./equipment-type-summaries.queries";
import { EquipmentTypeSummariesFilters } from "./equipment-type-summaries-filters";
import { EquipmentTypeSummariesTable } from "./equipment-type-summaries-table";

export type EquipmentTypesSearch = {
	page: number;
	pageSize: number;
	search?: string;
	branchId?: string;
};

interface EquipmentTypesPageProps {
	search: EquipmentTypesSearch;
	onSearchChange: (
		updater: (previous: EquipmentTypesSearch) => EquipmentTypesSearch,
	) => void;
	onEquipmentTypeClick: (
		equipmentType: GetEquipmentTypeSummariesItemDto,
	) => void;
}

export function EquipmentTypesPage({
	search,
	onSearchChange,
	onEquipmentTypeClick,
}: EquipmentTypesPageProps) {
	const [searchInput, setSearchInput] = useState(search.search ?? "");
	const debouncedSearch = useDebounce(searchInput, 300);
	const { data, isFetching, isError } = useEquipmentTypeSummaries(search);
	const equipmentTypeIds =
		data?.data.map((equipmentType) => equipmentType.id) ?? [];
	const {
		data: productUsages,
		isFetching: isFetchingProductUsages,
		isError: isProductUsagesError,
	} = useEquipmentTypeProductUsages(equipmentTypeIds);
	const { data: branches = [] } = useBranches({ isActive: true });
	const productsByEquipmentTypeId = new Map(
		(productUsages ?? []).map((usage) => [
			usage.equipmentTypeId,
			usage.products,
		]),
	);

	const pagination: PaginationState = {
		pageIndex: search.page - 1,
		pageSize: search.pageSize,
	};

	useEffect(() => {
		setSearchInput(search.search ?? "");
	}, [search.search]);

	useEffect(() => {
		const nextSearch = debouncedSearch.trim() || undefined;
		if (nextSearch === search.search) {
			return;
		}

		startTransition(() => {
			onSearchChange((previous) => ({
				...previous,
				search: nextSearch,
				page: 1,
			}));
		});
	}, [debouncedSearch, onSearchChange, search.search]);

	function handleFilterChange(filters: Partial<EquipmentTypesSearch>) {
		onSearchChange((previous) => ({
			...previous,
			...filters,
			page: 1,
		}));
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
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Inventario
					</h1>
					<p className="text-muted-foreground text-sm">
						Gestiona el equipamiento físico que tiene tu negocio.
					</p>
				</div>
				<CreateEquipmentTypeDialog />
			</div>

			<EquipmentTypeSummariesFilters
				filters={search}
				searchValue={searchInput}
				branches={branches}
				onSearchChange={setSearchInput}
				onFilterChange={handleFilterChange}
				onClearFilters={handleClearFilters}
			/>

			{isError || isProductUsagesError ? (
				<p className="text-destructive text-sm">
					No pudimos cargar el inventario de equipos. Inténtalo nuevamente.
				</p>
			) : (
				<EquipmentTypeSummariesTable
					equipmentTypes={data?.data ?? []}
					total={data?.total ?? 0}
					pagination={pagination}
					onPaginationChange={handlePaginationChange}
					onRowClick={onEquipmentTypeClick}
					productsByEquipmentTypeId={productsByEquipmentTypeId}
					isLoading={isFetching || isFetchingProductUsages}
				/>
			)}
		</div>
	);
}
