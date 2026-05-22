import {
	flexRender,
	getCoreRowModel,
	type PaginationState,
	type Table as TanStackTable,
	useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { Building2, ChevronLeft, ChevronRight, User } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatOrderNumber, getRelativeOrderDateContext } from "@/features/orders/order.utils";
import type {
	ParsedPendingReviewOrderListItem,
} from "@/features/orders/orders.queries";
import type { PendingReviewOrdersSearch } from "@/features/orders/pending-review-orders.search";
import { OrderStatusBadge } from "./order-status-badge";

interface PendingReviewOrdersTableProps {
	orders: ParsedPendingReviewOrderListItem[];
	meta?: {
		total: number;
		totalPages: number;
	};
	search: PendingReviewOrdersSearch;
	isLoading: boolean;
	isError: boolean;
	onPageChange: (page: number) => void;
	onRowClick: (order: ParsedPendingReviewOrderListItem) => void;
}

export function PendingReviewOrdersTable({
	orders,
	meta,
	search,
	isLoading,
	isError,
	onPageChange,
	onRowClick,
}: PendingReviewOrdersTableProps) {
	const columns = createPendingReviewOrdersColumns();

	const table = useReactTable({
		data: orders,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		rowCount: meta?.total ?? 0,
		pageCount: meta?.totalPages ?? -1,
		state: {
			pagination: {
				pageIndex: search.page - 1,
				pageSize: search.limit,
			},
		},
		onPaginationChange: (updater) => {
			const current: PaginationState = {
				pageIndex: search.page - 1,
				pageSize: search.limit,
			};
			const next = typeof updater === "function" ? updater(current) : updater;
			onPageChange(next.pageIndex + 1);
		},
	});

	return (
		<div className="space-y-2">
			<div className="rounded-md border bg-white">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const align = (
										header.column.columnDef.meta as
											| { align?: string }
											| undefined
									)?.align;

									return (
										<TableHead
											key={header.id}
											className={align === "right" ? "text-right" : undefined}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>

					<TableBody>
						<TableBodyContent
							table={table}
							isLoading={isLoading}
							isError={isError}
							pageLimit={search.limit}
							hasLocationFilter={Boolean(search.locationId)}
							onRowClick={onRowClick}
						/>
					</TableBody>
				</Table>
			</div>

			<PaginationFooter
				page={search.page}
				totalPages={meta?.totalPages ?? 1}
				total={meta?.total ?? 0}
				canPrevious={table.getCanPreviousPage()}
				canNext={table.getCanNextPage()}
				onPrevious={() => table.previousPage()}
				onNext={() => table.nextPage()}
			/>
		</div>
	);
}

function createPendingReviewOrdersColumns(): ColumnDef<ParsedPendingReviewOrderListItem>[] {
	return [
		{
			accessorKey: "number",
			header: "Pedido",
			cell: ({ row }) => (
				<div className="space-y-1">
					<p className="font-medium text-foreground">
						#{formatOrderNumber(row.original.number)}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<OrderStatusBadge status={row.original.status} />
					</div>
				</div>
			),
		},
		{
			id: "customer",
			header: "Cliente",
			cell: ({ row }) => {
				const customer = row.original.customer;

				if (!customer) {
					return (
						<span className="text-sm text-muted-foreground">Sin cliente</span>
					);
				}

				return (
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="gap-1 rounded-full px-2 py-0.5">
								{customer.isCompany ? (
									<Building2 className="h-3 w-3" />
								) : (
									<User className="h-3 w-3" />
								)}
								{customer.isCompany ? "Empresa" : "Persona"}
							</Badge>
						</div>
						<p className="text-sm text-foreground">{customer.displayName}</p>
					</div>
				);
			},
		},
		{
			id: "location",
			header: "Ubicación",
			cell: ({ row }) => (
				<span className="text-sm text-foreground">
					{row.original.location.name}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Solicitado",
			cell: ({ row }) => <DateCell value={row.original.createdAt} />,
			meta: { align: "right" },
		},
		{
			accessorKey: "periodStart",
			header: "Retiro",
			cell: ({ row }) => <DateCell value={row.original.periodStart} />,
			meta: { align: "right" },
		},
		{
			accessorKey: "periodEnd",
			header: "Devolución",
			cell: ({ row }) => <DateCell value={row.original.periodEnd} />,
			meta: { align: "right" },
		},
	];
}

function DateCell({
	value,
}: {
	value: ParsedPendingReviewOrderListItem["createdAt"];
}) {
	const relativeContext = getRelativeOrderDateContext(value, dayjs());

	return (
		<div className="space-y-1 text-right">
			<p className="text-sm text-foreground tabular-nums">
				{value.format("MMM D, YYYY")} · {value.format("HH:mm")}
			</p>
			<p className="text-xs text-muted-foreground">{relativeContext.label}</p>
		</div>
	);
}

function TableBodyContent({
	table,
	isLoading,
	isError,
	pageLimit,
	hasLocationFilter,
	onRowClick,
}: {
	table: TanStackTable<ParsedPendingReviewOrderListItem>;
	isLoading: boolean;
	isError: boolean;
	pageLimit: number;
	hasLocationFilter: boolean;
	onRowClick: (order: ParsedPendingReviewOrderListItem) => void;
}) {
	const colSpan = table.getAllColumns().length;

	if (isLoading) {
		return <SkeletonRows columns={colSpan} rows={pageLimit} />;
	}

	if (isError) {
		return (
			<TableRow>
				<TableCell
					colSpan={colSpan}
					className="h-32 text-center text-muted-foreground"
				>
					No pudimos cargar los pedidos pendientes de revisión.
				</TableCell>
			</TableRow>
		);
	}

	if (table.getRowModel().rows.length === 0) {
		return (
			<TableRow>
				<TableCell
					colSpan={colSpan}
					className="h-32 text-center text-muted-foreground"
				>
					{hasLocationFilter
						? "No hay solicitudes pendientes para la ubicación seleccionada."
						: "No hay solicitudes pendientes de revisión en este momento."}
				</TableCell>
			</TableRow>
		);
	}

	return table.getRowModel().rows.map((row) => (
		<TableRow
			key={row.id}
			className="cursor-pointer hover:bg-muted/40"
			onClick={() => onRowClick(row.original)}
		>
			{row.getVisibleCells().map((cell) => {
				const align = (
					cell.column.columnDef.meta as { align?: string } | undefined
				)?.align;

				return (
					<TableCell
						key={cell.id}
						className={align === "right" ? "text-right" : undefined}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				);
			})}
		</TableRow>
	));
}

function SkeletonRows({ columns, rows }: { columns: number; rows: number }) {
	const skeletonCount = Math.min(rows, 10);

	return (
		<>
			{Array.from({ length: skeletonCount }).map((_, i) => (
				// biome-ignore lint: fine to use key here
				<TableRow key={i}>
					{Array.from({ length: columns }).map((_, j) => (
						// biome-ignore lint: fine to use key here
						<TableCell key={j}>
							<Skeleton className="h-4 w-full" />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}

function PaginationFooter({
	page,
	totalPages,
	total,
	canPrevious,
	canNext,
	onPrevious,
	onNext,
}: {
	page: number;
	totalPages: number;
	total: number;
	canPrevious: boolean;
	canNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-1 py-2">
			<p className="text-sm text-muted-foreground">
				{total} solicitud{total !== 1 ? "es" : ""} total
			</p>

			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground tabular-nums">
					Página {page} de {totalPages}
				</span>
				<Button
					variant="outline"
					size="icon"
					onClick={onPrevious}
					disabled={!canPrevious}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onClick={onNext}
					disabled={!canNext}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
