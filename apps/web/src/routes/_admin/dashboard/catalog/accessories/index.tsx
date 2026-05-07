import { RentalItemKind } from "@repo/types";
import { createFileRoute } from "@tanstack/react-router";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ProductsTable } from "@/features/catalog/product-types/components/products-table";
import {
	productQueries,
	useProducts,
} from "@/features/catalog/product-types/products.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import useDebounce from "@/shared/hooks/use-debounce";

export const Route = createFileRoute("/_admin/dashboard/catalog/accessories/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(
			productQueries.list({ kind: RentalItemKind.ACCESSORY }),
		),
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el catalogo de accesorios."
				forbiddenMessage="No tienes permisos para ver los accesorios."
			/>
		);
	},
	component: AccessoriesPage,
});

const DEFAULT_PAGINATION: PaginationState = {
	pageIndex: 0,
	pageSize: 20,
};

function AccessoriesPage() {
	const [pagination, setPagination] =
		useState<PaginationState>(DEFAULT_PAGINATION);
	const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);

	const { data: accessories, isFetching } = useProducts({
		kind: RentalItemKind.ACCESSORY,
		page: pagination.pageIndex + 1, // TanStack Table is 0-indexed; API is 1-indexed
		limit: pagination.pageSize,
		categoryId,
		search: debouncedSearch || undefined,
	});

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
					placeholder="Buscar accesorios"
					value={search}
					onChange={(event) => handleSearchChange(event.target.value)}
				/>
			</header>

			<div className="p-6 space-y-2">
				<h1 className="text-lg font-semibold">Catálogo de Accesorios</h1>

				<ProductsTable
					products={accessories?.data ?? []}
					meta={
						accessories?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 }
					}
					pagination={pagination}
					categoryId={categoryId}
					onPaginationChange={setPagination}
					onCategoryChange={handleCategoryChange}
					isLoading={isFetching}
					copy={{
						allCategoriesLabel: "Todas",
						categoryPlaceholder: "Todas las categorías",
						emptyMessage: "No se encontraron accesorios.",
						noItemsMessage: "No hay accesorios",
						totalItemsLabel: "accesorios",
					}}
				/>
			</div>
		</>
	);
}
