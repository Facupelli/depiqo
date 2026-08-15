import type {
	GetRentalsSortByDto,
	GetRentalsSortDirectionDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
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
import type { ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	type PaginationState,
	type Table as TanStackTable,
	useReactTable,
} from "@tanstack/react-table";
import type { Dayjs } from "dayjs";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Building2,
	ChevronLeft,
	ChevronRight,
	User,
} from "lucide-react";
import dayjs from "@/lib/dates/dayjs";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import type { ParsedRentalListItem } from "@/modules/rentals/rental.queries";
import { getRentalOrderStatusPresentation } from "@/modules/rentals/shared/rental-order-status";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import {
	formatOrderNumber,
	getRelativeOrderDateContext,
} from "@/shared/utils/formatters";
import {
	getEffectiveRentalOrdersSort,
	type RentalOrdersListSort,
	useRentalOrdersList,
} from "./rental-orders-list.context";

export function RentalOrdersTable() {
	const {
		rentals,
		meta,
		search,
		isLoading,
		isBranchesLoading,
		isError,
		setPage,
		setSort,
		openRentalOrder,
		getBranchName,
		getOperationalTimezone,
	} = useRentalOrdersList();
	const currentSort = getEffectiveRentalOrdersSort(search);
	const tenantTimezone = useTenantTimezone();
	const columns = createRentalOrdersColumns({
		currentSort,
		onSortChange: setSort,
		getBranchName,
		getOperationalTimezone,
		tenantTimezone,
	});
	const table = useReactTable({
		data: rentals,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
		rowCount: meta.total,
		pageCount: meta.totalPages,
		state: {
			pagination: { pageIndex: search.page - 1, pageSize: search.limit },
			sorting: [
				{ id: currentSort.sortBy, desc: currentSort.sortDirection === "desc" },
			],
		},
		onPaginationChange: (updater) => {
			const current: PaginationState = {
				pageIndex: search.page - 1,
				pageSize: search.limit,
			};
			const next = typeof updater === "function" ? updater(current) : updater;
			setPage(next.pageIndex + 1);
		},
	});

	return (
		<div className="space-y-2">
			<div className="rounded-md border">
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
							isLoading={isLoading || isBranchesLoading}
							isError={isError}
							pageLimit={search.limit}
							onRowClick={openRentalOrder}
							getOperationalTimezone={getOperationalTimezone}
						/>
					</TableBody>
				</Table>
			</div>

			<PaginationFooter
				page={search.page}
				totalPages={meta.totalPages}
				total={meta.total}
				canPrevious={table.getCanPreviousPage()}
				canNext={table.getCanNextPage()}
				onPrevious={() => table.previousPage()}
				onNext={() => table.nextPage()}
			/>
		</div>
	);
}

function createRentalOrdersColumns({
	currentSort,
	onSortChange,
	getBranchName,
	getOperationalTimezone,
	tenantTimezone,
}: {
	currentSort: RentalOrdersListSort;
	onSortChange: (
		sortBy: GetRentalsSortByDto,
		nextDirection?: GetRentalsSortDirectionDto,
	) => void;
	getBranchName: (branchId: string) => string | undefined;
	getOperationalTimezone: (branchId: string) => string;
	tenantTimezone: string;
}): ColumnDef<ParsedRentalListItem>[] {
	return [
		{
			accessorKey: "rentalNumber",
			header: "Pedido",
			cell: ({ row }) => (
				<div className="space-y-1">
					<p className="font-medium text-foreground">
						#{formatOrderNumber(row.original.rentalNumber)}
					</p>
					<p className="font-mono text-[11px] text-muted-foreground/80">
						{row.original.id}
					</p>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Estado",
			cell: ({ row }) => <RentalOrderStatusBadge rental={row.original} />,
		},
		{
			accessorKey: "fulfillmentMethod",
			header: "Entrega",
			cell: ({ row }) => (
				<span className="text-sm text-foreground">
					{row.original.fulfillmentMethod === "DELIVERY"
						? "Delivery"
						: "Retiro"}
				</span>
			),
		},
		{
			id: "customer",
			header: "Cliente",
			cell: ({ row }) => {
				const customer = row.original.customer;
				if (!customer)
					return (
						<span className="text-sm text-muted-foreground">Sin cliente</span>
					);

				return (
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="gap-1 rounded-full px-2 py-0.5">
							{customer.isCompany ? (
								<Building2 className="h-3 w-3" />
							) : (
								<User className="h-3 w-3" />
							)}
							{customer.isCompany ? "Empresa" : "Persona"}
						</Badge>
						<span className="text-sm text-foreground">
							{customer.displayName}
						</span>
					</div>
				);
			},
		},
		{
			id: "branch",
			header: "Ubicación",
			cell: ({ row }) => (
				<span className="text-sm text-foreground">
					{getBranchName(row.original.branchId) ?? "Sucursal no encontrada"}
				</span>
			),
		},
		{
			accessorKey: "pickupAt",
			id: "pickupDate",
			header: () => (
				<SortableHeader
					label="Retira"
					sortBy="pickupDate"
					currentSort={currentSort}
					onSortChange={onSortChange}
				/>
			),
			cell: ({ row }) => (
				<RentalOrderDateCell
					value={row.original.pickupAt}
					timezone={getOperationalTimezone(row.original.branchId)}
					emphasis="primary"
				/>
			),
			meta: { align: "right" },
		},
		{
			accessorKey: "returnAt",
			id: "returnDate",
			header: () => (
				<SortableHeader
					label="Devuelve"
					sortBy="returnDate"
					currentSort={currentSort}
					onSortChange={onSortChange}
				/>
			),
			cell: ({ row }) => (
				<RentalOrderDateCell
					value={row.original.returnAt}
					timezone={getOperationalTimezone(row.original.branchId)}
					emphasis="secondary"
				/>
			),
			meta: { align: "right" },
		},
		{
			accessorKey: "createdAt",
			id: "createdAt",
			header: () => (
				<SortableHeader
					label="Creado"
					sortBy="createdAt"
					currentSort={currentSort}
					onSortChange={onSortChange}
				/>
			),
			cell: ({ row }) => (
				<p className="text-xs text-muted-foreground tabular-nums">
					{formatTimestampInTimezone(
						row.original.createdAt,
						tenantTimezone,
						"MMM D, YYYY",
					)}
				</p>
			),
			meta: { align: "right" },
		},
	];
}

function RentalOrderStatusBadge({ rental }: { rental: ParsedRentalListItem }) {
	const config = getRentalOrderStatusPresentation(rental, dayjs());

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
				config.badgeClassName,
			)}
		>
			{config.label}
		</span>
	);
}

function SortableHeader({
	label,
	sortBy,
	currentSort,
	onSortChange,
}: {
	label: string;
	sortBy: GetRentalsSortByDto;
	currentSort: RentalOrdersListSort;
	onSortChange: (
		sortBy: GetRentalsSortByDto,
		nextDirection?: GetRentalsSortDirectionDto,
	) => void;
}) {
	const isActive = currentSort.sortBy === sortBy;
	const nextDirection = !isActive
		? getDefaultDirection(sortBy)
		: currentSort.sortDirection === "desc"
			? "asc"
			: undefined;

	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-3 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
			onClick={() => onSortChange(sortBy, nextDirection)}
		>
			{label}
			{isActive ? (
				currentSort.sortDirection === "desc" ? (
					<ArrowDown className="ml-1 h-3.5 w-3.5" />
				) : (
					<ArrowUp className="ml-1 h-3.5 w-3.5" />
				)
			) : (
				<ArrowUpDown className="ml-1 h-3.5 w-3.5" />
			)}
		</Button>
	);
}

function RentalOrderDateCell({
	value,
	timezone,
	emphasis,
}: {
	value: ParsedRentalListItem["pickupAt"];
	timezone: string;
	emphasis: "primary" | "secondary";
}) {
	const localizedValue = value.tz(timezone);
	const localizedNow = dayjs().tz(timezone);
	const relativeContext = getRelativeOrderDateContext(
		localizedValue,
		localizedNow,
	);

	return (
		<div className="space-y-1 text-right">
			<p
				className={cn(
					"tabular-nums",
					emphasis === "primary"
						? "text-sm font-semibold text-foreground"
						: "text-sm text-muted-foreground",
				)}
			>
				{formatTimestamp(value, timezone)}
			</p>
			<p
				className={cn(
					"text-xs font-medium",
					relativeContext.isToday && "text-amber-700",
					relativeContext.isFuture &&
						!relativeContext.isToday &&
						"text-sky-700",
					relativeContext.isPast && "text-muted-foreground",
				)}
			>
				{relativeContext.label}
			</p>
		</div>
	);
}

function TableBodyContent({
	table,
	isLoading,
	isError,
	pageLimit,
	onRowClick,
	getOperationalTimezone,
}: {
	table: TanStackTable<ParsedRentalListItem>;
	isLoading: boolean;
	isError: boolean;
	pageLimit: number;
	onRowClick: (rental: ParsedRentalListItem) => void;
	getOperationalTimezone: (branchId: string) => string;
}) {
	const colSpan = table.getAllColumns().length;
	const referenceDate = dayjs();

	if (isLoading) return <SkeletonRows columns={colSpan} rows={pageLimit} />;

	if (isError) {
		return (
			<TableRow>
				<TableCell
					colSpan={colSpan}
					className="h-32 text-center text-muted-foreground"
				>
					No pudimos cargar los pedidos.
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
					No hay pedidos para los filtros seleccionados.
				</TableCell>
			</TableRow>
		);
	}

	return table.getRowModel().rows.map((row) => (
		<TableRow
			key={row.id}
			className={cn(
				"cursor-pointer",
				hasRentalOrderTodayEvent(
					row.original,
					referenceDate,
					getOperationalTimezone(row.original.branchId),
				) && "bg-amber-50/60 hover:bg-amber-100/60",
			)}
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
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<TableRow key={i}>
					{Array.from({ length: columns }).map((_, j) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells are static placeholders.
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
				{total} pedido{total !== 1 ? "s" : ""} total
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

function hasRentalOrderTodayEvent(
	rental: Pick<ParsedRentalListItem, "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
	timezone: string,
): boolean {
	const localizedReferenceDate = referenceDate.tz(timezone);

	return [rental.pickupAt, rental.returnAt].some(
		(value) =>
			getRelativeOrderDateContext(value.tz(timezone), localizedReferenceDate)
				.isToday,
	);
}

function getDefaultDirection(
	sortBy: GetRentalsSortByDto,
): GetRentalsSortDirectionDto {
	return sortBy === "createdAt" ? "desc" : "asc";
}

function formatTimestamp(
	value: ParsedRentalListItem["createdAt"],
	timezone: string,
): string {
	const localizedValue = value.tz(timezone);

	return `${localizedValue.format("MMM D, YYYY")} · ${localizedValue.format("HH:mm")}`;
}
