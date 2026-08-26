import type {
	EquipmentTypeProductUsageProductDto,
	GetEquipmentTypeSummariesItemDto,
} from "@repo/api-contracts";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createEquipmentTypeSummariesColumns } from "./equipment-type-summaries-columns";

interface EquipmentTypeSummariesTableProps {
	equipmentTypes: GetEquipmentTypeSummariesItemDto[];
	productsByEquipmentTypeId: ReadonlyMap<
		string,
		EquipmentTypeProductUsageProductDto[]
	>;
	total: number;
	pagination: PaginationState;
	onPaginationChange: (pagination: PaginationState) => void;
	onRowClick?: (equipmentType: GetEquipmentTypeSummariesItemDto) => void;
	isLoading?: boolean;
}

export function EquipmentTypeSummariesTable({
	equipmentTypes,
	productsByEquipmentTypeId,
	total,
	pagination,
	onPaginationChange,
	onRowClick,
	isLoading = false,
}: EquipmentTypeSummariesTableProps) {
	const columns = createEquipmentTypeSummariesColumns({
		productsByEquipmentTypeId,
	});
	const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
	const table = useReactTable({
		data: equipmentTypes,
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
	const lastItem = Math.min(
		(pagination.pageIndex + 1) * pagination.pageSize,
		total,
	);
	const skeletonRowKeys = Array.from(
		{ length: 5 },
		(_, index) => `loading-row-${pagination.pageIndex}-${index}`,
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
									className={
										onRowClick
											? "cursor-pointer transition-colors hover:bg-muted/40"
											: undefined
									}
									onClick={() => onRowClick?.(row.original)}
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
									No se encontraron equipos.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between text-muted-foreground text-sm">
				<span>
					{total > 0
						? `${firstItem}–${lastItem} de ${total} equipos`
						: "No hay equipos"}
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
