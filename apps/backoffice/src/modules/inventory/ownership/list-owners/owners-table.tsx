import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";

interface OwnersDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	searchColumn?: string;
	searchPlaceholder?: string;
	noDataMessage?: string;
	itemLabel?: string;
	handleRowClick?: (row: TData) => void;
	toolbarActions?: ReactNode;
}

export function OwnersDataTable<TData, TValue>({
	columns,
	data,
	searchColumn,
	searchPlaceholder = "Buscar...",
	noDataMessage = "No se encontraron resultados.",
	itemLabel = "elementos",
	handleRowClick,
	toolbarActions,
}: OwnersDataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		state: {
			sorting,
			columnFilters,
		},
		initialState: {
			pagination: { pageSize: 10 },
		},
	});

	const { pageIndex, pageSize } = table.getState().pagination;
	const totalRows = table.getFilteredRowModel().rows.length;
	const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
	const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

	return (
		<div className="space-y-4">
			{searchColumn || toolbarActions ? (
				<section className="flex flex-col gap-2 rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs sm:flex-row sm:items-center">
					{searchColumn ? (
						<div className="min-w-0 flex-1">
							<Input
								placeholder={searchPlaceholder}
								value={
									(table.getColumn(searchColumn)?.getFilterValue() as string) ??
									""
								}
								onChange={(event) =>
									table
										.getColumn(searchColumn)
										?.setFilterValue(event.target.value)
								}
								className="w-full"
							/>
						</div>
					) : null}

					{toolbarActions ? (
						<div className="flex shrink-0 justify-end sm:ml-auto">
							{toolbarActions}
						</div>
					) : null}
				</section>
			) : null}

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
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									onClick={() => handleRowClick?.(row.original)}
									className={clsx(
										handleRowClick &&
											"cursor-pointer hover:bg-muted/50 transition-colors",
									)}
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
									{noDataMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<span>
					Mostrando {firstRow} a {lastRow} de {totalRows} {itemLabel}
				</span>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Anterior
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Siguiente
					</Button>
				</div>
			</div>
		</div>
	);
}
