import type { GetRentableItemsQueryDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import type { PaginationState } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import useDebounce from "@/shared/hooks/use-debounce";
import { useProducts } from "./product-list.queries";
import { ProductListFilters } from "./product-list-filters";
import { ProductListTable } from "./product-list-table";

type ProductListSearch = Omit<GetRentableItemsQueryDto, "kind"> & {
	page: number;
	pageSize: number;
	kind?: Extract<GetRentableItemsQueryDto["kind"], "SINGLE" | "PACKAGE">;
};

export function ProductsPage({ search }: { search: ProductListSearch }) {
	const navigate = useNavigate({ from: "/dashboard/catalog/" });
	const [searchInput, setSearchInput] = useState(search.search ?? "");
	const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
	const debouncedSearch = useDebounce(searchInput, 300);

	const { data, isFetching, isError } = useProducts(search);
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
		if (nextSearch === search.search) return;

		startTransition(() => {
			navigate({
				search: (previous) => ({ ...previous, search: nextSearch, page: 1 }),
				replace: true,
			});
		});
	}, [debouncedSearch, navigate, search.search]);

	function handleFilterChange(filters: Partial<typeof search>) {
		navigate({
			search: (previous) => ({ ...previous, ...filters, page: 1 }),
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
			search: (previous) => ({ page: 1, pageSize: previous.pageSize }),
			replace: true,
		});
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona lo que tus clientes pueden alquilar
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								Nuevo producto
							</Button>
						}
					/>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => navigate({ to: "/dashboard/catalog/new" })}
						>
							Individual
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								navigate({ to: "/dashboard/catalog/packages/new" })
							}
						>
							Combo
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<ProductListFilters
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
					No pudimos cargar los productos. Inténtalo nuevamente.
				</p>
			) : (
				<ProductListTable
					items={data?.data ?? []}
					total={data?.total ?? 0}
					pagination={pagination}
					onPaginationChange={handlePaginationChange}
					onRowClick={(rentableItemId) =>
						navigate({
							to: "/dashboard/catalog/$rentableItemId",
							params: { rentableItemId },
						})
					}
					categoryNameById={categoryNameById}
					isLoading={isFetching}
				/>
			)}
		</div>
	);
}
