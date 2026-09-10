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
import { Link } from "@tanstack/react-router";
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
	Loader2,
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
		effectiveRequest,
		isLoading,
		isBranchesLoading,
		isRefreshing,
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
		showBranch: effectiveRequest.branchId === undefined,
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

	const collectionIsLoading = isLoading || isBranchesLoading;

	return (
		<div className="space-y-2">
			<div className="hidden overflow-hidden rounded-lg border bg-card @2xl/rentals-index:block">
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
											className={cn(
												align === "right" && "text-right",
												getResponsiveColumnClass(header.column.id),
											)}
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
									);
								})}
							</TableRow>
						))}
					</TableHeader>

					<TableBody>
						<TableBodyContent
							table={table}
							isLoading={collectionIsLoading}
							isError={isError}
							pageLimit={search.limit}
							onRowClick={openRentalOrder}
							getOperationalTimezone={getOperationalTimezone}
						/>
					</TableBody>
				</Table>
			</div>

			<CompactRentalOrdersList
				rentals={rentals}
				isLoading={collectionIsLoading}
				isRefreshing={isRefreshing}
				isError={isError}
				pageLimit={search.limit}
				getOperationalTimezone={getOperationalTimezone}
			/>

			<PaginationFooter
				page={search.page}
				totalPages={meta.totalPages}
				total={meta.total}
				isLoading={isLoading}
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
	showBranch,
	onSortChange,
	getBranchName,
	getOperationalTimezone,
	tenantTimezone,
}: {
	currentSort: RentalOrdersListSort;
	showBranch: boolean;
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
				<div className="min-w-0 space-y-1">
					<p className="break-words font-medium text-foreground">
						#{formatOrderNumber(row.original.rentalNumber)}
					</p>
					<div className="@5xl/rentals-index:hidden">
						<RentalOrderStatusBadge rental={row.original} />
					</div>
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
					{getFulfillmentMethodLabel(row.original)}
				</span>
			),
		},
		{
			id: "customer",
			header: "Cliente",
			cell: ({ row }) => (
				<div className="min-w-0 space-y-1">
					<RentalOrderCustomer rental={row.original} />
					<p className="text-xs text-muted-foreground @5xl/rentals-index:hidden">
						{getFulfillmentMethodLabel(row.original)}
					</p>
				</div>
			),
		},
		...(showBranch
			? [
					{
						id: "branch",
						header: "Ubicación",
						cell: ({ row }) => (
							<span className="text-sm text-foreground">
								{getBranchName(row.original.branchId) ??
									"Sucursal no encontrada"}
							</span>
						),
					} satisfies ColumnDef<ParsedRentalListItem>,
				]
			: []),
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

function RentalOrderCustomer({ rental }: { rental: ParsedRentalListItem }) {
	const customer = rental.customer;

	if (!customer) {
		return <span className="text-sm text-muted-foreground">Sin cliente</span>;
	}

	return (
		<div className="flex min-w-0 items-center gap-2">
			<Badge
				variant="outline"
				className="shrink-0 gap-1 rounded-full px-1 py-0.5"
			>
				{customer.isCompany ? (
					<Building2 className="size-3" />
				) : (
					<User className="size-3" />
				)}
			</Badge>
			<span className="min-w-0 break-words text-sm text-foreground">
				{customer.displayName}
			</span>
		</div>
	);
}

function getFulfillmentMethodLabel(
	rental: ParsedRentalListItem,
): "Delivery" | "Retiro" {
	return rental.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Retiro";
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
	align = "right",
}: {
	value: ParsedRentalListItem["pickupAt"];
	timezone: string;
	emphasis: "primary" | "secondary";
	align?: "left" | "right";
}) {
	const localizedValue = value.tz(timezone);
	const localizedNow = dayjs().tz(timezone);
	const relativeContext = getRelativeOrderDateContext(
		localizedValue,
		localizedNow,
	);

	return (
		<div className={cn("space-y-1", align === "right" && "text-right")}>
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
						className={cn(
							align === "right" && "text-right",
							getResponsiveColumnClass(cell.column.id),
						)}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				);
			})}
		</TableRow>
	));
}

function getResponsiveColumnClass(columnId: string): string | undefined {
	if (
		["status", "fulfillmentMethod", "branch", "createdAt"].includes(columnId)
	) {
		return "hidden @5xl/rentals-index:table-cell";
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

function CompactRentalOrdersList({
	rentals,
	isLoading,
	isRefreshing,
	isError,
	pageLimit,
	getOperationalTimezone,
}: {
	rentals: ParsedRentalListItem[];
	isLoading: boolean;
	isRefreshing: boolean;
	isError: boolean;
	pageLimit: number;
	getOperationalTimezone: (branchId: string) => string;
}) {
	const referenceDate = dayjs();

	return (
		<div className="@2xl/rentals-index:hidden">
			<div className="flex min-h-5 justify-end px-1">
				<RefreshingIndicator isRefreshing={isRefreshing} />
			</div>
			{isLoading ? (
				<CompactSkeletonRows rows={pageLimit} />
			) : isError ? (
				<p className="border-y px-4 py-12 text-center text-sm text-muted-foreground">
					No pudimos cargar los pedidos.
				</p>
			) : rentals.length === 0 ? (
				<p className="border-y px-4 py-12 text-center text-sm text-muted-foreground">
					No hay pedidos para los filtros seleccionados.
				</p>
			) : (
				<ul className="divide-y border-y">
					{rentals.map((rental) => {
						const timezone = getOperationalTimezone(rental.branchId);
						const isToday = hasRentalOrderTodayEvent(
							rental,
							referenceDate,
							timezone,
						);

						return (
							<li key={rental.id} className={cn(isToday && "bg-amber-50/60")}>
								<Link
									to="/dashboard/orders/$orderId"
									params={{ orderId: rental.id }}
									className="block min-w-0 space-y-3 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
								>
									<div className="flex min-w-0 items-start justify-between gap-3">
										<p className="min-w-0 break-words font-semibold text-sm text-foreground">
											#{formatOrderNumber(rental.rentalNumber)}
										</p>
										<RentalOrderStatusBadge rental={rental} />
									</div>
									<div className="min-w-0 space-y-1">
										<RentalOrderCustomer rental={rental} />
										<p className="text-xs text-muted-foreground">
											{getFulfillmentMethodLabel(rental)}
										</p>
									</div>
									<div className="grid grid-cols-2 gap-x-4 gap-y-2">
										<CompactRentalOrderDate
											label="Retira"
											value={rental.pickupAt}
											timezone={timezone}
											emphasis="primary"
										/>
										<CompactRentalOrderDate
											label="Devuelve"
											value={rental.returnAt}
											timezone={timezone}
											emphasis="secondary"
										/>
									</div>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function CompactRentalOrderDate({
	label,
	value,
	timezone,
	emphasis,
}: {
	label: "Retira" | "Devuelve";
	value: ParsedRentalListItem["pickupAt"];
	timezone: string;
	emphasis: "primary" | "secondary";
}) {
	return (
		<div className="min-w-0 space-y-1">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<RentalOrderDateCell
				value={value}
				timezone={timezone}
				emphasis={emphasis}
				align="left"
			/>
		</div>
	);
}

function CompactSkeletonRows({ rows }: { rows: number }) {
	return (
		<ul className="divide-y border-y" aria-label="Cargando pedidos">
			{Array.from({ length: Math.min(rows, 10) }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<li key={index} className="space-y-3 px-3 py-3">
					<Skeleton className="h-5 w-2/3" />
					<Skeleton className="h-4 w-1/2" />
					<div className="grid grid-cols-2 gap-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</li>
			))}
		</ul>
	);
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
	isLoading,
	canPrevious,
	canNext,
	onPrevious,
	onNext,
}: {
	page: number;
	totalPages: number;
	total: number;
	isLoading: boolean;
	canPrevious: boolean;
	canNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-1 py-2">
			{isLoading ? (
				<Skeleton className="h-4 w-28" />
			) : (
				<p className="text-sm text-muted-foreground">
					{total} pedido{total !== 1 ? "s" : ""} total
				</p>
			)}

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
