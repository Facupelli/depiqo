import type { GetEquipmentTypeSummariesItemDto } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { PaginationState } from "@tanstack/react-table";
import { startTransition, useEffect, useState } from "react";
import { z } from "zod";
import { CreateEquipmentTypeDialog } from "@/features/asset-inventory/equipment-types/create-equipment-type/create-equipment-type-dialog";
import { useEquipmentTypeSummaries } from "@/features/asset-inventory/equipment-types/equipment-types.queries";
import { EquipmentTypeSummariesFilters } from "@/features/asset-inventory/equipment-types/get-equipment-type-summaries/components/equipment-type-summaries-filters";
import { EquipmentTypeSummariesTable } from "@/features/asset-inventory/equipment-types/get-equipment-type-summaries/components/equipment-type-summaries-table";
import { useBranches } from "@/features/tenant-management/branch/branch.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import useDebounce from "@/shared/hooks/use-debounce";

const BooleanSearchParamSchema = z.preprocess((value) => {
	if (value === undefined || value === null || value === "") {
		return undefined;
	}
	if (value === true || value === "true") {
		return true;
	}
	if (value === false || value === "false") {
		return false;
	}
	return value;
}, z.boolean().optional());

const equipmentTypesSearchSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().trim().min(1).optional(),
	isActive: BooleanSearchParamSchema,
	branchId: z.string().trim().min(1).optional(),
});

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/",
)({
	validateSearch: equipmentTypesSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el inventario de equipos."
				forbiddenMessage="No tienes permisos para ver el inventario de equipos."
			/>
		);
	},
	component: EquipmentTypesPage,
});

function EquipmentTypesPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();

	const [searchInput, setSearchInput] = useState(search.search ?? "");
	const debouncedSearch = useDebounce(searchInput, 300);

	const { data, isFetching, isError } = useEquipmentTypeSummaries(search);
	const { data: branches = [] } = useBranches({ isActive: true });

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
			navigate({
				search: (previous) => ({
					...previous,
					search: nextSearch,
					page: 1,
				}),
				replace: true,
			});
		});
	}, [debouncedSearch, navigate, search.search]);

	function handleFilterChange(filters: Partial<typeof search>) {
		navigate({
			search: (previous) => ({
				...previous,
				...filters,
				page: 1,
			}),
			replace: true,
		});
	}

	function handlePaginationChange(nextPagination: PaginationState) {
		navigate({
			search: (previous) => ({
				...previous,
				page: nextPagination.pageIndex + 1,
				pageSize: nextPagination.pageSize,
			}),
			replace: true,
		});
	}

	function handleClearFilters() {
		setSearchInput("");
		navigate({
			search: (previous) => ({
				page: 1,
				pageSize: previous.pageSize,
			}),
			replace: true,
		});
	}

	function handleEquipmentTypeClick(
		equipmentType: GetEquipmentTypeSummariesItemDto,
	) {
		navigate({
			to: "/dashboard/inventory/equipment-types/$equipmentTypeId",
			params: { equipmentTypeId: equipmentType.id },
		});
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Equipos</h1>
					<p className="text-muted-foreground text-sm">
						Consulta los tipos de equipo operativos y su stock por sucursal.
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

			{isError ? (
				<p className="text-destructive text-sm">
					No pudimos cargar el inventario de equipos. Inténtalo nuevamente.
				</p>
			) : (
				<EquipmentTypeSummariesTable
					equipmentTypes={data?.data ?? []}
					total={data?.total ?? 0}
					pagination={pagination}
					onPaginationChange={handlePaginationChange}
					onRowClick={handleEquipmentTypeClick}
					isLoading={isFetching}
				/>
			)}
		</div>
	);
}
