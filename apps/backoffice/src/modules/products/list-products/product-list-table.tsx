import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import {
	flexRender,
	getCoreRowModel,
	type PaginationState,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createProductListColumns } from "./product-list-columns";

interface ProductListTableProps {
	items: GetRentableItemsItemDto[];
	total: number;
	pagination: PaginationState;
	onPaginationChange: (pagination: PaginationState) => void;
	onRowClick: (rentableItemId: string) => void;
	categoryNameById: Map<string, string>;
	isLoading?: boolean;
	isRefreshing?: boolean;
}

export function ProductListTable({
	items,
	total,
	pagination,
	onPaginationChange,
	onRowClick,
	categoryNameById,
	isLoading = false,
	isRefreshing = false,
}: ProductListTableProps) {
	const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
	const columns = createProductListColumns({ categoryNameById });
	const table = useReactTable({
		data: items,
		columns,
		state: { pagination },
		pageCount,
		manualPagination: true,
		onPaginationChange: (updater) => {
			const next =
				typeof updater === "function" ? updater(pagination) : updater;
			onPaginationChange(next);
		},
		getCoreRowModel: getCoreRowModel(),
	});

	const firstItem =
		total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
	const skeletonRowKeys = Array.from(
		{ length: 5 },
		(_, index) => `loading-row-${pagination.pageIndex}-${index}`,
	);
	const lastItem = Math.min(
		(pagination.pageIndex + 1) * pagination.pageSize,
		total,
	);

	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-lg border bg-background shadow-sm">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-muted/40">
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder ? null : header.index === 0 ? (
											<div className="flex items-center justify-between gap-3">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												<span
													className={
														isRefreshing
															? "flex items-center gap-1.5 font-normal text-muted-foreground text-xs"
															: "invisible flex items-center gap-1.5 font-normal text-xs"
													}
													aria-live="polite"
												>
													<Loader2 className="size-3 animate-spin" />
													Actualizando...
												</span>
											</div>
										) : (
											flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							skeletonRowKeys.map((rowKey) => (
								<TableRow key={rowKey}>
									{columns.map((column) => (
										<TableCell key={`${column.id}-${rowKey}`}>
											<div className="h-4 w-full animate-pulse rounded bg-muted" />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="cursor-pointer transition-colors hover:bg-muted/50"
									onClick={() => onRowClick(row.original.id)}
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
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									No se encontraron ítems rentables.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<span>
					{isLoading
						? "Cargando..."
						: total > 0
							? `${firstItem}–${lastItem} de ${total} ítems`
							: "No hay ítems"}
				</span>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage() || isLoading}
					>
						<span className="sr-only">Página anterior</span>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="min-w-24 text-center">
						Página {pagination.pageIndex + 1} de {pageCount}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage() || isLoading}
					>
						<span className="sr-only">Página siguiente</span>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
