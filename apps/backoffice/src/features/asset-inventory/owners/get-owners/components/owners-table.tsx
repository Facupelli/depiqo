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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface OwnersDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	searchColumn?: string;
	searchPlaceholder?: string;
	noDataMessage?: string;
	handleRowClick?: (row: TData) => void;
}

export function OwnersDataTable<TData, TValue>({
	columns,
	data,
	searchColumn,
	searchPlaceholder = "Buscar...",
	noDataMessage = "No se encontraron propietarios.",
	handleRowClick,
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
			{searchColumn && (
				<Input
					placeholder={searchPlaceholder}
					value={
						(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
					}
					onChange={(event) =>
						table.getColumn(searchColumn)?.setFilterValue(event.target.value)
					}
					className="max-w-sm"
				/>
			)}

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
					Mostrando {firstRow} a {lastRow} de {totalRows} propietarios
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
