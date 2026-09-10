import type { GetRentableItemsItemDto } from "@repo/api-contracts";
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
import { ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProductStatusBadge } from "../product-status-badge";
import {
	ComboImage,
	createComboListColumns,
	getComboCategoryLabel,
	getComboEquipmentCountLabel,
	getComboStartingPriceLabel,
} from "./combo-list-columns";
import { ComboListRowActions } from "./combo-list-row-actions";

interface ComboListTableProps {
	items: GetRentableItemsItemDto[];
	total: number;
	pagination: PaginationState;
	categoryNameById: Map<string, string>;
	onPaginationChange: (pagination: PaginationState) => void;
	onRowClick: (rentableItemId: string) => void;
	onArchive: (item: GetRentableItemsItemDto) => void;
	onRetry: () => void;
	isLoading: boolean;
	isRefreshing: boolean;
	isError: boolean;
	isFiltered: boolean;
	emptyAction: ReactNode;
}

export function ComboListTable(props: ComboListTableProps) {
	const {
		items,
		total,
		pagination,
		categoryNameById,
		onPaginationChange,
		onRowClick,
		onArchive,
		onRetry,
		isLoading,
		isRefreshing,
		isError,
		isFiltered,
		emptyAction,
	} = props;
	const columns = createComboListColumns({ categoryNameById, onArchive });
	const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
	const table = useReactTable({
		data: items,
		columns,
		state: { pagination },
		pageCount,
		manualPagination: true,
		onPaginationChange: (updater) =>
			onPaginationChange(
				typeof updater === "function" ? updater(pagination) : updater,
			),
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
			<div className="hidden overflow-hidden rounded-lg border bg-card @2xl/combo-index:block">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((group) => (
							<TableRow key={group.id} className="bg-muted/40">
								{group.headers.map((header) => (
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
							<SkeletonRows count={columns.length} />
						) : isError ? (
							<CollectionMessage
								columns={columns.length}
								isError
								action={<RetryButton onRetry={onRetry} />}
							>
								No pudimos cargar los combos.
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
							<CollectionMessage
								columns={columns.length}
								action={!isFiltered ? emptyAction : undefined}
							>
								{isFiltered ? (
									"No se encontraron combos con estos filtros."
								) : (
									<>
										<strong className="font-medium text-foreground">
											Todavía no tienes combos.
										</strong>
										<span>
											Crea un combo para ofrecer varios equipos como una sola
											opción de alquiler.
										</span>
									</>
								)}
							</CollectionMessage>
						)}
					</TableBody>
				</Table>
			</div>

			<CompactComboList {...props} />

			{isError ? null : (
				<div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm">
					<span>
						{isLoading
							? "Cargando..."
							: total > 0
								? `${firstItem}–${lastItem} de ${total} combos`
								: "No hay combos"}
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

function CompactComboList({
	items,
	categoryNameById,
	onArchive,
	onRetry,
	isLoading,
	isRefreshing,
	isError,
	isFiltered,
	emptyAction,
}: ComboListTableProps) {
	return (
		<div className="@2xl/combo-index:hidden">
			<div className="flex min-h-5 justify-end px-1">
				<RefreshingIndicator isRefreshing={isRefreshing} />
			</div>
			{isLoading ? (
				<CompactSkeletonRows />
			) : isError ? (
				<div className="flex flex-col items-center gap-4 border-y px-4 py-12 text-center text-destructive text-sm">
					<span>No pudimos cargar los combos.</span>
					<RetryButton onRetry={onRetry} />
				</div>
			) : items.length === 0 ? (
				<div className="space-y-4 border-y px-4 py-12 text-center text-muted-foreground text-sm">
					{isFiltered ? (
						<p>No se encontraron combos con estos filtros.</p>
					) : (
						<>
							<p className="font-medium text-foreground">
								Todavía no tienes combos.
							</p>
							<p>
								Crea un combo para ofrecer varios equipos como una sola opción
								de alquiler.
							</p>
							<div className="flex justify-center">{emptyAction}</div>
						</>
					)}
				</div>
			) : (
				<ul className="divide-y border-y">
					{items.map((item) => (
						<li key={item.id} className="relative px-3 py-3">
							<Link
								to="/dashboard/catalog/packages/$rentableItemId"
								params={{ rentableItemId: item.id }}
								preload={false}
								className="block space-y-3 rounded-sm pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<div className="flex min-w-0 items-start gap-3">
									<ComboImage item={item} />
									<div className="min-w-0 flex-1 space-y-1">
										<p className="break-words font-medium">{item.name}</p>
										<p className="text-muted-foreground text-xs">
											{getComboCategoryLabel(item, categoryNameById)}
										</p>
										<ProductStatusBadge status={item.status} />
									</div>
								</div>
								<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
									<span>{getComboEquipmentCountLabel(item)}</span>
									<span className="font-medium">
										{getComboStartingPriceLabel(item) ?? (
											<span className="text-muted-foreground">-</span>
										)}
									</span>
								</div>
							</Link>
							<div className="absolute top-2 right-2">
								<ComboListRowActions item={item} onArchive={onArchive} />
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
	return (
		<Button variant="outline" size="sm" onClick={onRetry}>
			<RotateCcw className="mr-2 size-4" />
			Reintentar
		</Button>
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
					"h-32 text-center text-muted-foreground",
					isError && "text-destructive",
				)}
			>
				<div className="flex flex-col items-center gap-3">
					{children}
					{action}
				</div>
			</TableCell>
		</TableRow>
	);
}
function SkeletonRows({ count }: { count: number }) {
	return Array.from({ length: 5 }).map((_, row) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
		<TableRow key={`row-${row}`}>
			{Array.from({ length: count }).map((__, column) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton columns are static placeholders.
				<TableCell key={`cell-${column}`}>
					<Skeleton className="h-4 w-full" />
				</TableCell>
			))}
		</TableRow>
	));
}
function CompactSkeletonRows() {
	return (
		<ul className="divide-y border-y" aria-label="Cargando combos">
			{Array.from({ length: 5 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<li key={`combo-${index}`} className="space-y-3 px-3 py-3">
					<div className="flex gap-3">
						<Skeleton className="size-12 shrink-0" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					</div>
					<Skeleton className="h-4 w-full" />
				</li>
			))}
		</ul>
	);
}
