import { Button } from "@repo/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { PaginationState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useCategories } from "@/features/catalog/categories/categories.queries";
import { RentableItemsFilters } from "@/features/catalog/rentable-items/get-rentable-items/components/rentable-items-filters";
import { RentableItemsTable } from "@/features/catalog/rentable-items/get-rentable-items/components/rentable-items-table";
import { useRentableItems } from "@/features/catalog/rentable-items/rentable-items.queries";
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

const catalogSearchSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().trim().min(1).optional(),
	kind: z.enum(["SINGLE", "PACKAGE"]).optional(),
	status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
	categoryId: z.string().trim().min(1).optional(),
	branchId: z.string().trim().min(1).optional(),
	isVisible: BooleanSearchParamSchema,
	isRentable: BooleanSearchParamSchema,
	hasActivePricing: BooleanSearchParamSchema,
});

export const Route = createFileRoute("/_admin/dashboard/catalog/")({
	validateSearch: catalogSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el catálogo."
				forbiddenMessage="No tienes permisos para ver el catálogo."
			/>
		);
	},
	component: RentalCatalogPage,
});

function RentalCatalogPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();

	const [searchInput, setSearchInput] = useState(search.search ?? "");
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
	const debouncedSearch = useDebounce(searchInput, 300);

	const { data, isFetching, isError } = useRentableItems(search);
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches({ isActive: true });
	const activeCategories = categories.filter((category) => category.isActive);
	const categoryNameById = useMemo(
		() => new Map(categories.map((category) => [category.id, category.name])),
		[categories],
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

	function handleRowClick(rentableItemId: string) {
		navigate({
			to: "/dashboard/catalog/$rentableItemId",
			params: { rentableItemId },
		});
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona los ítems que tus clientes pueden alquilar.
					</p>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => navigate({ to: "/dashboard/catalog/packages/new" })}
					>
						<Plus className="mr-2 h-4 w-4" />
						Crear combo
					</Button>
					<Button onClick={() => navigate({ to: "/dashboard/catalog/new" })}>
						<Plus className="mr-2 h-4 w-4" />
						Crear equipo
					</Button>
				</div>
			</div>

			<RentableItemsFilters
				filters={search}
				searchValue={searchInput}
				categories={activeCategories}
				branches={branches}
				isAdvancedOpen={isAdvancedOpen}
				onSearchChange={setSearchInput}
				onFilterChange={handleFilterChange}
				onToggleAdvanced={() => setIsAdvancedOpen((isOpen) => !isOpen)}
				onClearFilters={handleClearFilters}
			/>

			{isError ? (
				<p className="text-sm text-destructive">
					No pudimos cargar el catálogo. Inténtalo nuevamente.
				</p>
			) : (
				<RentableItemsTable
					items={data?.data ?? []}
					total={data?.total ?? 0}
					pagination={pagination}
					onPaginationChange={handlePaginationChange}
					onRowClick={handleRowClick}
					categoryNameById={categoryNameById}
					isLoading={isFetching}
				/>
			)}
		</div>
	);
}
