import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useNavigate } from "@tanstack/react-router";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	type PaginationState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { productColumns } from "./products-columns";
import type { PaginationMeta, ProductTypeResponse } from "@repo/schemas";
import { useCategories } from "../../product-categories/categories.queries";

interface ProductsTableProps {
	products: ProductTypeResponse[];
	meta: PaginationMeta;
	pagination: PaginationState;
	categoryId: string | undefined;
	variant?: "products" | "accessories";
	onPaginationChange: (updater: PaginationState) => void;
	onCategoryChange: (categoryId: string | undefined) => void;
	isLoading?: boolean;
	copy?: ProductsTableCopy;
}

interface ProductsTableCopy {
	allCategoriesLabel: string;
	categoryPlaceholder: string;
	emptyMessage: string;
	noItemsMessage: string;
	totalItemsLabel: string;
}

const defaultCopy: ProductsTableCopy = {
	allCategoriesLabel: "Todas",
	categoryPlaceholder: "Todas las categorías",
	emptyMessage: "No se encontraron productos.",
	noItemsMessage: "No hay productos",
	totalItemsLabel: "productos",
};

const ALL_CATEGORIES_VALUE = "All";

export function ProductsTable({
	products,
	meta,
	pagination,
	categoryId,
	variant = "products",
	onPaginationChange,
	onCategoryChange,
	isLoading,
	copy = defaultCopy,
}: ProductsTableProps) {
	const navigate = useNavigate();
	const { data: categories } = useCategories();

	const table = useReactTable({
		data: products,
		columns: productColumns,
		state: { pagination },
		pageCount: meta.totalPages,
		manualPagination: true,
		manualFiltering: true,
		onPaginationChange: (updater) => {
			const next =
				typeof updater === "function" ? updater(pagination) : updater;
			onPaginationChange(next);
		},
		getCoreRowModel: getCoreRowModel(),
	});

	function handleCategoryChange(value: string | null) {
		const categoryId = value === null ? undefined : value;
		onCategoryChange(
			categoryId === ALL_CATEGORIES_VALUE ? undefined : categoryId,
		);
	}

	function handleRowClick(product: ProductTypeResponse) {
		if (variant === "accessories") {
			navigate({
				to: "/dashboard/catalog/accessories/$accessoryId",
				params: { accessoryId: product.id },
			});
			return;
		}

		navigate({
			to: "/dashboard/catalog/products/$productId",
			params: { productId: product.id },
		});
	}

	const categoryList = categories ?? [];
	const { pageIndex, pageSize } = pagination;
	const firstItem = meta.total === 0 ? 0 : pageIndex * pageSize + 1;
	const lastItem = Math.min((pageIndex + 1) * pageSize, meta.total);
	const tableCopy = { ...defaultCopy, ...copy };

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center gap-3">
				<Select
					value={categoryId ?? ALL_CATEGORIES_VALUE}
					onValueChange={handleCategoryChange}
					items={categories?.map((category) => ({
						label: category.name,
						value: category.id,
					}))}
				>
					<SelectTrigger className="w-52">
						<SelectValue placeholder={tableCopy.categoryPlaceholder} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_CATEGORIES_VALUE}>
							{tableCopy.allCategoriesLabel}
						</SelectItem>
						{categoryList.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>

					<TableBody>
						{isLoading ? (
							// Skeleton rows — preserve table height during fetch to avoid layout shift
							Array.from({ length: pageSize }).map((_, i) => (
								<TableRow key={i}>
									{productColumns.map((_, j) => (
										<TableCell key={j}>
											<div className="h-4 w-full animate-pulse rounded bg-muted" />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									onClick={() => handleRowClick(row.original)}
									className="cursor-pointer hover:bg-muted/50 transition-colors"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={productColumns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{tableCopy.emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination footer */}
			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<span>
					{meta.total > 0
						? `${firstItem}–${lastItem} de ${meta.total} ${tableCopy.totalItemsLabel}`
						: tableCopy.noItemsMessage}
				</span>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						aria-label="Previous page"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					<span className="min-w-20 text-center">
						Página {meta.page} de {meta.totalPages}
					</span>

					<Button
						variant="outline"
						size="icon"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						aria-label="Next page"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
