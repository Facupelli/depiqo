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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	createProductListColumns,
	getProductBranchSummary,
	getProductCategoryLabel,
	getProductEquipmentCountLabel,
	getProductKindLabel,
	getProductStartingPriceLabel,
	ProductImage,
	ProductStatusBadge,
} from "./product-list-columns";

interface ProductListTableProps {
	items: GetRentableItemsItemDto[];
	total: number;
	pagination: PaginationState;
	onPaginationChange: (pagination: PaginationState) => void;
	onRowClick: (rentableItemId: string) => void;
	categoryNameById: Map<string, string>;
	isSingleBranchScope: boolean;
	isLoading?: boolean;
	isRefreshing?: boolean;
	isError?: boolean;
}

export function ProductListTable({
	items,
	total,
	pagination,
	onPaginationChange,
	onRowClick,
	categoryNameById,
	isSingleBranchScope,
	isLoading = false,
	isRefreshing = false,
	isError = false,
}: ProductListTableProps) {
	const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
	const columns = createProductListColumns({
		categoryNameById,
		isSingleBranchScope,
	});
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
			<div className="hidden overflow-hidden rounded-lg border bg-background shadow-sm @2xl/catalog-index:block">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-muted/40">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={getResponsiveColumnClass(header.column.id)}
									>
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
							<SkeletonRows
								columns={columns.map((column) => column.id ?? "")}
							/>
						) : isError ? (
							<CollectionMessage columns={columns.length} isError>
								No pudimos cargar los productos. Inténtalo nuevamente.
							</CollectionMessage>
						) : table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="cursor-pointer transition-colors hover:bg-muted/50"
									onClick={() => onRowClick(row.original.id)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className={getResponsiveColumnClass(cell.column.id)}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<CollectionMessage columns={columns.length}>
								No se encontraron ítems rentables.
							</CollectionMessage>
						)}
					</TableBody>
				</Table>
			</div>

			<CompactProductList
				items={items}
				categoryNameById={categoryNameById}
				isSingleBranchScope={isSingleBranchScope}
				isLoading={isLoading}
				isRefreshing={isRefreshing}
				isError={isError}
			/>

			{isError ? null : (
				<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
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
			)}
		</div>
	);
}

function getResponsiveColumnClass(columnId: string): string | undefined {
	if (["category", "offers"].includes(columnId)) {
		return "hidden @5xl/catalog-index:table-cell";
	}
	return undefined;
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
}: {
	columns: number;
	children: React.ReactNode;
	isError?: boolean;
}) {
	return (
		<TableRow>
			<TableCell
				colSpan={columns}
				className={cn(
					"h-24 text-center text-muted-foreground",
					isError && "text-destructive",
				)}
			>
				{children}
			</TableCell>
		</TableRow>
	);
}

function SkeletonRows({ columns }: { columns: string[] }) {
	return Array.from({ length: 5 }).map((_, rowIndex) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
		<TableRow key={rowIndex}>
			{columns.map((columnId) => (
				<TableCell
					key={columnId}
					className={getResponsiveColumnClass(columnId)}
				>
					<Skeleton className="h-4 w-full" />
				</TableCell>
			))}
		</TableRow>
	));
}

function CompactProductList({
	items,
	categoryNameById,
	isSingleBranchScope,
	isLoading,
	isRefreshing,
	isError,
}: {
	items: GetRentableItemsItemDto[];
	categoryNameById: Map<string, string>;
	isSingleBranchScope: boolean;
	isLoading: boolean;
	isRefreshing: boolean;
	isError: boolean;
}) {
	return (
		<div className="@2xl/catalog-index:hidden">
			<div className="flex min-h-5 justify-end px-1">
				<RefreshingIndicator isRefreshing={isRefreshing} />
			</div>
			{isLoading ? (
				<CompactSkeletonRows />
			) : isError ? (
				<p className="border-y px-4 py-12 text-center text-sm text-destructive">
					No pudimos cargar los productos. Inténtalo nuevamente.
				</p>
			) : items.length === 0 ? (
				<p className="border-y px-4 py-12 text-center text-sm text-muted-foreground">
					No se encontraron ítems rentables.
				</p>
			) : (
				<ul className="divide-y border-y">
					{items.map((item) => (
						<li key={item.id}>
							<Link
								to="/dashboard/catalog/$rentableItemId"
								params={{ rentableItemId: item.id }}
								preload={false}
								className="block min-w-0 space-y-3 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
							>
								<div className="flex min-w-0 items-start gap-3">
									<ProductImage item={item} />
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
											<p className="min-w-0 break-words font-medium text-foreground">
												{item.name}
											</p>
											<ProductStatusBadge status={item.status} />
										</div>
										<p className="break-words text-xs text-muted-foreground">
											{getProductKindLabel(item.kind)} ·{" "}
											{getProductCategoryLabel(item, categoryNameById)}
										</p>
										{isSingleBranchScope ? null : (
											<p className="break-words text-xs text-muted-foreground">
												{getProductBranchSummary(item)}
											</p>
										)}
									</div>
								</div>
								<div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
									<span className="min-w-0 break-words font-medium">
										{getProductStartingPriceLabel(item)}
									</span>
									<span className="text-muted-foreground">
										{getProductEquipmentCountLabel(item)}
									</span>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function CompactSkeletonRows() {
	return (
		<ul className="divide-y border-y" aria-label="Cargando productos">
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
					<div className="flex justify-between gap-4">
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-4 w-20" />
					</div>
				</li>
			))}
		</ul>
	);
}
