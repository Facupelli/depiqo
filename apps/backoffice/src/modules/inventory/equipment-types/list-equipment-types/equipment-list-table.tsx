import type { ListEquipmentTypesItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Link } from "@tanstack/react-router";
import {
	flexRender,
	getCoreRowModel,
	type PaginationState,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
	createEquipmentListColumns,
	EquipmentImage,
	getEquipmentRentalSummaryLabel,
	getEquipmentUnitCountLabel,
} from "./equipment-list-columns";
import { EquipmentListRowActions } from "./equipment-list-row-actions";

interface EquipmentListTableProps {
	items: ListEquipmentTypesItemDto[];
	total: number;
	pagination: PaginationState;
	onPaginationChange: (pagination: PaginationState) => void;
	onRowClick: (equipmentTypeId: string) => void;
	onEdit: (equipmentTypeId: string) => void;
	onAddUnit: (equipmentTypeId: string) => void;
	showBranchStock: boolean;
	isLoading: boolean;
	isRefreshing: boolean;
	isError: boolean;
	emptyAction: ReactNode;
}

export function EquipmentListTable({
	items,
	total,
	pagination,
	onPaginationChange,
	onRowClick,
	onEdit,
	onAddUnit,
	showBranchStock,
	isLoading,
	isRefreshing,
	isError,
	emptyAction,
}: EquipmentListTableProps) {
	const columns = createEquipmentListColumns({
		showBranchStock,
		onEdit,
		onAddUnit,
	});
	const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
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
	const lastItem = Math.min(
		(pagination.pageIndex + 1) * pagination.pageSize,
		total,
	);

	return (
		<div className="space-y-4">
			<div className="hidden overflow-hidden rounded-lg border bg-background shadow-sm @2xl/equipment-index:block">
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
												<RefreshingIndicator isRefreshing={isRefreshing} />
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
							<SkeletonRows columnCount={columns.length} />
						) : isError ? (
							<CollectionMessage columns={columns.length} isError>
								No pudimos cargar los equipos. Inténtalo nuevamente.
							</CollectionMessage>
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
							<CollectionMessage columns={columns.length} action={emptyAction}>
								No se encontraron equipos.
							</CollectionMessage>
						)}
					</TableBody>
				</Table>
			</div>

			<CompactEquipmentList
				items={items}
				showBranchStock={showBranchStock}
				isLoading={isLoading}
				isRefreshing={isRefreshing}
				isError={isError}
				emptyAction={emptyAction}
				onEdit={onEdit}
				onAddUnit={onAddUnit}
			/>

			{isError ? null : (
				<div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm">
					<span>
						{isLoading
							? "Cargando..."
							: total > 0
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
							<ChevronLeft className="size-4" />
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
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function CompactEquipmentList({
	items,
	showBranchStock,
	isLoading,
	isRefreshing,
	isError,
	emptyAction,
	onEdit,
	onAddUnit,
}: Omit<
	EquipmentListTableProps,
	"total" | "pagination" | "onPaginationChange" | "onRowClick"
>) {
	return (
		<div className="@2xl/equipment-index:hidden">
			<div className="flex min-h-5 justify-end px-1">
				<RefreshingIndicator isRefreshing={isRefreshing} />
			</div>
			{isLoading ? (
				<CompactSkeletonRows />
			) : isError ? (
				<p className="border-y px-4 py-12 text-center text-destructive text-sm">
					No pudimos cargar los equipos. Inténtalo nuevamente.
				</p>
			) : items.length === 0 ? (
				<div className="space-y-4 border-y px-4 py-12 text-center text-muted-foreground text-sm">
					<p>No se encontraron equipos.</p>
					<div className="flex justify-center">{emptyAction}</div>
				</div>
			) : (
				<ul className="divide-y border-y">
					{items.map((item) => (
						<li key={item.id} className="relative px-3 py-3">
							<Link
								to="/dashboard/inventory/equipment-types/$equipmentTypeId"
								params={{ equipmentTypeId: item.id }}
								preload={false}
								className="block cursor-pointer space-y-3 rounded-sm pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<div className="flex min-w-0 items-start gap-3">
									<EquipmentImage item={item} />
									<div className="min-w-0 flex-1 space-y-1">
										<p className="min-w-0 break-words font-medium">
											{item.name}
										</p>
										<p className="text-muted-foreground text-xs">
											{item.category?.name ?? "Sin categoría"}
										</p>
									</div>
								</div>
								<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
									<span>
										{getEquipmentUnitCountLabel(item.activeUnitCount)}
									</span>
									{showBranchStock ? (
										<span className="text-muted-foreground">
											Sucursal:{" "}
											{getEquipmentUnitCountLabel(
												item.selectedBranchUnitCount ?? 0,
											)}
										</span>
									) : null}
								</div>
								<p className="text-muted-foreground text-sm">
									{getEquipmentRentalSummaryLabel(item) ?? "-"}
								</p>
							</Link>
							<div className="absolute top-2 right-2">
								<EquipmentListRowActions
									equipmentName={item.name}
									onEdit={() => onEdit(item.id)}
									onAddUnit={() => onAddUnit(item.id)}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function RefreshingIndicator({ isRefreshing }: { isRefreshing: boolean }) {
	return (
		<span
			className={cn(
				"flex items-center gap-1.5 font-normal text-xs",
				isRefreshing ? "text-muted-foreground" : "invisible",
			)}
			aria-live="polite"
		>
			<Loader2 className="size-3 animate-spin" />
			Actualizando...
		</span>
	);
}

function CollectionMessage({
	columns,
	children,
	isError = false,
	action,
}: {
	columns: number;
	children: ReactNode;
	isError?: boolean;
	action?: ReactNode;
}) {
	return (
		<TableRow>
			<TableCell
				colSpan={columns}
				className={cn(
					"h-28 text-center text-muted-foreground",
					isError && "text-destructive",
				)}
			>
				<div className="flex flex-col items-center gap-4">
					<span>{children}</span>
					{action}
				</div>
			</TableCell>
		</TableRow>
	);
}

function SkeletonRows({ columnCount }: { columnCount: number }) {
	return Array.from({ length: 5 }).map((_, rowIndex) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
		<TableRow key={rowIndex}>
			{Array.from({ length: columnCount }).map((__, columnIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton columns are static placeholders.
				<TableCell key={columnIndex}>
					<Skeleton className="h-4 w-full" />
				</TableCell>
			))}
		</TableRow>
	));
}

function CompactSkeletonRows() {
	return (
		<ul className="divide-y border-y" aria-label="Cargando equipos">
			{Array.from({ length: 5 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<li key={index} className="space-y-3 px-3 py-3">
					<div className="flex gap-3">
						<Skeleton className="size-12 shrink-0" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					</div>
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-full" />
				</li>
			))}
		</ul>
	);
}
