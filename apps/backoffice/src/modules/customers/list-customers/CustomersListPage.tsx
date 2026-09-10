import type {
	GetRentalCustomersItemDto,
	GetRentalCustomersQueryDto,
	RentalCustomerOnboardingStatusDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type Table as TanStackTable,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import useDebounce from "@/shared/hooks/use-debounce";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCustomers } from "./list-customers.queries";

export type CustomersListSearch = {
	page: number;
	pageSize: number;
	status?: RentalCustomerOnboardingStatusDto;
};

const DEFAULT_PAGE_SIZE = 20;

const ONBOARDING_STATUSES: RentalCustomerOnboardingStatusDto[] = [
	"NOT_STARTED",
	"PENDING",
	"APPROVED",
	"REJECTED",
];

const ONBOARDING_STATUS_LABELS: Record<
	RentalCustomerOnboardingStatusDto,
	string
> = {
	NOT_STARTED: "No iniciado",
	PENDING: "Pendiente",
	APPROVED: "Aprobado",
	REJECTED: "Rechazado",
};

type BadgeVariant = "secondary" | "outline" | "default" | "destructive";

const ONBOARDING_STATUS_VARIANT: Record<
	RentalCustomerOnboardingStatusDto,
	BadgeVariant
> = {
	NOT_STARTED: "outline",
	PENDING: "secondary",
	APPROVED: "default",
	REJECTED: "destructive",
};

function getCustomerName(customer: GetRentalCustomersItemDto) {
	return `${customer.firstName} ${customer.lastName}`;
}

function getCustomerEmail(customer: GetRentalCustomersItemDto) {
	return customer.email;
}

function formatCustomerCreatedDate(createdAt: string, timezone: string) {
	return formatTimestampInTimezone(createdAt, timezone, "DD MMM, YYYY");
}

function CustomerOnboardingBadge({
	status,
}: {
	status: RentalCustomerOnboardingStatusDto;
}) {
	return (
		<Badge variant={ONBOARDING_STATUS_VARIANT[status]}>
			{ONBOARDING_STATUS_LABELS[status]}
		</Badge>
	);
}

function createCustomersColumns(
	timezone: string,
): ColumnDef<GetRentalCustomersItemDto>[] {
	return [
		{
			id: "name",
			header: "Nombre",
			accessorFn: getCustomerName,
			cell: ({ row }) => (
				<div className="space-y-1">
					<p className="font-medium leading-snug">
						{getCustomerName(row.original)}
					</p>
					<p className="text-xs text-muted-foreground tabular-nums @5xl/customers-index:hidden">
						{formatCustomerCreatedDate(row.original.createdAt, timezone)}
					</p>
				</div>
			),
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{getCustomerEmail(row.original)}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: "Onboarding",
			cell: ({ row }) => (
				<CustomerOnboardingBadge status={row.original.status} />
			),
		},
		{
			accessorKey: "createdAt",
			header: "Creado",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground tabular-nums">
					{formatCustomerCreatedDate(row.original.createdAt, timezone)}
				</span>
			),
		},
	];
}

function getCustomerColumnClass(columnId: string) {
	return columnId === "createdAt"
		? "hidden @5xl/customers-index:table-cell"
		: undefined;
}

export function CustomersListPage({ search }: { search: CustomersListSearch }) {
	const timezone = useTenantTimezone();
	const navigate = useNavigate({ from: "/dashboard/customers/" });
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebounce(searchInput, 300);

	const queryParams = useMemo<GetRentalCustomersQueryDto>(() => {
		const normalizedSearch = debouncedSearch.trim();

		return {
			page: search.page,
			pageSize: search.pageSize,
			...(normalizedSearch ? { search: normalizedSearch } : {}),
			...(search.status ? { status: search.status } : {}),
		};
	}, [debouncedSearch, search.page, search.pageSize, search.status]);

	const { data, isLoading, isError } = useCustomers(queryParams, {
		placeholderData: keepPreviousData,
	});

	const customers = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / search.pageSize));
	const hasActiveFilters = !!searchInput || !!search.status;

	const handleSearchInputChange = (value: string) => {
		setSearchInput(value);

		if (search.page !== 1) {
			navigate({
				search: (previous) => ({ ...previous, page: 1 }),
				replace: true,
			});
		}
	};

	const setStatus = (value: RentalCustomerOnboardingStatusDto | null) => {
		navigate({
			search: (previous) => ({
				...previous,
				status: value ?? undefined,
				page: 1,
			}),
			replace: true,
		});
	};

	const setPage = (page: number) => {
		navigate({
			search: (previous) => ({ ...previous, page }),
			replace: true,
		});
	};

	const resetFilters = () => {
		setSearchInput("");
		navigate({
			search: {
				status: undefined,
				page: 1,
				pageSize: DEFAULT_PAGE_SIZE,
			},
			replace: true,
		});
	};

	const table = useReactTable({
		data: customers,
		columns: createCustomersColumns(timezone),
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: totalPages,
		state: {
			pagination: {
				pageIndex: search.page - 1,
				pageSize: search.pageSize,
			},
		},
		onPaginationChange: (updater) => {
			const next =
				typeof updater === "function"
					? updater({ pageIndex: search.page - 1, pageSize: search.pageSize })
					: updater;
			setPage(next.pageIndex + 1);
		},
		manualFiltering: true,
	});

	return (
		<div className="space-y-4">
			<h1 className="sr-only">Clientes</h1>
			<div className="@container/customers-index space-y-4">
				<CustomersToolbar
					search={search}
					searchInput={searchInput}
					hasActiveFilters={hasActiveFilters}
					onSearchInputChange={handleSearchInputChange}
					setStatus={setStatus}
					resetFilters={resetFilters}
				/>

				<div className="hidden overflow-hidden rounded-lg border bg-card @2xl/customers-index:block">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={getCustomerColumnClass(header.column.id)}
										>
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
							<TableBodyContent
								table={table}
								isLoading={isLoading}
								isError={isError}
								pageSize={search.pageSize}
							/>
						</TableBody>
					</Table>
				</div>

				<CompactCustomersList
					customers={customers}
					isLoading={isLoading}
					isError={isError}
					pageSize={search.pageSize}
					timezone={timezone}
				/>

				<PaginationFooter
					page={search.page}
					totalPages={totalPages}
					total={total}
					canPrevious={table.getCanPreviousPage()}
					canNext={table.getCanNextPage()}
					onPrevious={() => table.previousPage()}
					onNext={() => table.nextPage()}
				/>
			</div>
		</div>
	);
}

function CustomersToolbar({
	search,
	searchInput,
	hasActiveFilters,
	onSearchInputChange,
	setStatus,
	resetFilters,
}: {
	search: CustomersListSearch;
	searchInput: string;
	hasActiveFilters: boolean;
	onSearchInputChange: (value: string) => void;
	setStatus: (value: RentalCustomerOnboardingStatusDto | null) => void;
	resetFilters: () => void;
}) {
	const statusItems = [
		{ label: "Todos", value: ALL_VALUE },
		...ONBOARDING_STATUSES.map((status) => ({
			label: ONBOARDING_STATUS_LABELS[status],
			value: status,
		})),
	];

	return (
		<section className="flex flex-col items-stretch gap-2 rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs @sm/customers-index:flex-row @sm/customers-index:flex-wrap @sm/customers-index:items-center">
			<Input
				placeholder="Search by name, email…"
				value={searchInput}
				onChange={(event) => onSearchInputChange(event.target.value)}
				className="h-9 w-full @sm/customers-index:w-64"
			/>

			<Select
				value={search.status ?? ALL_VALUE}
				onValueChange={(value) =>
					setStatus(
						value === ALL_VALUE
							? null
							: (value as RentalCustomerOnboardingStatusDto),
					)
				}
				items={statusItems}
			>
				<SelectTrigger className="h-9 w-full @sm/customers-index:w-44">
					<SelectValue placeholder="Onboarding status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>Todos</SelectItem>
					{ONBOARDING_STATUSES.map((status) => (
						<SelectItem key={status} value={status}>
							{ONBOARDING_STATUS_LABELS[status]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{hasActiveFilters && (
				<Button
					variant="ghost"
					size="sm"
					onClick={resetFilters}
					className="h-9 px-2 text-muted-foreground"
				>
					<X className="mr-1 h-3.5 w-3.5" />
					Reset
				</Button>
			)}
		</section>
	);
}

const ALL_VALUE = "__ALL__";

function TableBodyContent({
	table,
	isLoading,
	isError,
	pageSize,
}: {
	table: TanStackTable<GetRentalCustomersItemDto>;
	isLoading: boolean;
	isError: boolean;
	pageSize: number;
}) {
	const colSpan = table.getAllColumns().length;

	if (isLoading) {
		return (
			<SkeletonRows
				columnIds={table.getAllLeafColumns().map((column) => column.id)}
				rows={pageSize}
			/>
		);
	}

	if (isError) {
		return (
			<TableRow>
				<TableCell
					colSpan={colSpan}
					className="h-32 text-center text-muted-foreground"
				>
					Something went wrong loading customers.
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
					No customers found.
				</TableCell>
			</TableRow>
		);
	}

	return table.getRowModel().rows.map((row) => (
		<TableRow key={row.id}>
			{row.getVisibleCells().map((cell) => (
				<TableCell
					key={cell.id}
					className={getCustomerColumnClass(cell.column.id)}
				>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	));
}

function CompactCustomersList({
	customers,
	isLoading,
	isError,
	pageSize,
	timezone,
}: {
	customers: GetRentalCustomersItemDto[];
	isLoading: boolean;
	isError: boolean;
	pageSize: number;
	timezone: string;
}) {
	if (isLoading) {
		const skeletonKeys = Array.from(
			{ length: Math.min(pageSize, 10) },
			(_, index) => `compact-skeleton-${index}`,
		);

		return (
			<ul className="divide-y rounded-lg border bg-card @2xl/customers-index:hidden">
				{skeletonKeys.map((key) => (
					<li key={key} className="space-y-2 p-4">
						<div className="flex items-center justify-between gap-3">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-5 w-20" />
						</div>
						<Skeleton className="h-4 w-48 max-w-full" />
						<Skeleton className="h-3 w-24" />
					</li>
				))}
			</ul>
		);
	}

	if (isError) {
		return (
			<ul className="rounded-lg border bg-card @2xl/customers-index:hidden">
				<li className="px-4 py-12 text-center text-muted-foreground">
					Something went wrong loading customers.
				</li>
			</ul>
		);
	}

	if (customers.length === 0) {
		return (
			<ul className="rounded-lg border bg-card @2xl/customers-index:hidden">
				<li className="px-4 py-12 text-center text-muted-foreground">
					No customers found.
				</li>
			</ul>
		);
	}

	return (
		<ul className="divide-y rounded-lg border bg-card @2xl/customers-index:hidden">
			{customers.map((customer) => (
				<li key={customer.id} className="space-y-2 p-4">
					<div className="flex items-start justify-between gap-3">
						<p className="min-w-0 break-words font-medium leading-snug">
							{getCustomerName(customer)}
						</p>
						<CustomerOnboardingBadge status={customer.status} />
					</div>
					<p className="break-all text-sm text-muted-foreground">
						{getCustomerEmail(customer)}
					</p>
					<p className="text-xs text-muted-foreground tabular-nums">
						{formatCustomerCreatedDate(customer.createdAt, timezone)}
					</p>
				</li>
			))}
		</ul>
	);
}

function SkeletonRows({
	columnIds,
	rows,
}: {
	columnIds: string[];
	rows: number;
}) {
	const rowKeys = Array.from(
		{ length: Math.min(rows, 10) },
		(_, rowIndex) => `skeleton-row-${rowIndex}`,
	);

	return (
		<>
			{rowKeys.map((rowKey) => (
				<TableRow key={rowKey}>
					{columnIds.map((columnId) => (
						<TableCell
							key={columnId}
							className={getCustomerColumnClass(columnId)}
						>
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
				{total} customer{total !== 1 ? "s" : ""} total
			</p>

			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground tabular-nums">
					Page {page} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="icon"
					className="h-8 w-8"
					onClick={onPrevious}
					disabled={!canPrevious}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					className="h-8 w-8"
					onClick={onNext}
					disabled={!canNext}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
