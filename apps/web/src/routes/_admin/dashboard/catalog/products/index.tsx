import { RentalItemKind } from "@repo/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductsTable } from "@/features/catalog/product-types/components/products-table";
import {
	productQueries,
	useProducts,
} from "@/features/catalog/product-types/products.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import useDebounce from "@/shared/hooks/use-debounce";

export const Route = createFileRoute("/_admin/dashboard/catalog/products/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(
			productQueries.list({ kind: RentalItemKind.PRIMARY }),
		),
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el catalogo de productos."
				forbiddenMessage="No tienes permisos para ver los productos."
			/>
		);
	},
	component: ProductsPage,
});

const DEFAULT_PAGINATION: PaginationState = {
	pageIndex: 0,
	pageSize: 20,
};

function ProductsPage() {
	const [pagination, setPagination] =
		useState<PaginationState>(DEFAULT_PAGINATION);
	const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);

	const { data: products, isFetching } = useProducts({
		kind: RentalItemKind.PRIMARY,
		page: pagination.pageIndex + 1, // TanStack Table is 0-indexed; API is 1-indexed
		limit: pagination.pageSize,
		categoryId,
		search: debouncedSearch || undefined,
	});

	// When a filter changes, reset to first page to avoid landing on a
	// non-existent page (e.g. was on page 5, filter now yields only 2 pages)
	function handleCategoryChange(nextCategoryId: string | undefined) {
		setCategoryId(nextCategoryId);
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}

	function handleSearchChange(nextSearch: string) {
		setSearch(nextSearch);
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}

	return (
		<>
			<header className="flex items-center justify-between border-b gap-10 border-gray-200 bg-white p-6">
				<Input
					type="search"
					placeholder="Buscar productos"
					value={search}
					onChange={(event) => handleSearchChange(event.target.value)}
				/>

				<Button
					render={
						<Link to="/dashboard/catalog/products/new">Crear Producto</Link>
					}
				/>
			</header>

			<div className="p-6 space-y-2">
				<h1 className="text-lg font-semibold">Catálogo de Productos</h1>

				<ProductsTable
					products={products?.data ?? []}
					meta={
						products?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 }
					}
					pagination={pagination}
					categoryId={categoryId}
					onPaginationChange={setPagination}
					onCategoryChange={handleCategoryChange}
					isLoading={isFetching}
				/>
			</div>
		</>
	);
}
