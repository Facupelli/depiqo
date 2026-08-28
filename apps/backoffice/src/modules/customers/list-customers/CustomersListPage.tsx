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

function createCustomersColumns(
	timezone: string,
): ColumnDef<GetRentalCustomersItemDto>[] {
	return [
		{
			id: "name",
			header: "Nombre",
			accessorFn: (row) => `${row.firstName} ${row.lastName}`,
			cell: ({ row }) => {
				const { firstName, lastName } = row.original;
				return (
					<span className="font-medium leading-snug">
						{firstName} {lastName}
					</span>
				);
			},
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ getValue }) => (
				<span className="text-sm text-muted-foreground">
					{getValue<string>()}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: "Onboarding",
			cell: ({ getValue }) => {
				const status = getValue<RentalCustomerOnboardingStatusDto>();
				return (
					<Badge variant={ONBOARDING_STATUS_VARIANT[status]}>
						{ONBOARDING_STATUS_LABELS[status]}
					</Badge>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: "Creado",
			cell: ({ getValue }) => (
				<span className="text-sm text-muted-foreground tabular-nums">
					{formatTimestampInTimezone(
						getValue<string>(),
						timezone,
						"DD MMM, YYYY",
					)}
				</span>
			),
		},
	];
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
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage your customers — track, manage, and invite new ones.
				</p>
			</div>
			<div className="space-y-2">
				<CustomersToolbar
					search={search}
					searchInput={searchInput}
					hasActiveFilters={hasActiveFilters}
					onSearchInputChange={handleSearchInputChange}
					setStatus={setStatus}
					resetFilters={resetFilters}
				/>

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
							<TableBodyContent
								table={table}
								isLoading={isLoading}
								isError={isError}
								pageSize={search.pageSize}
							/>
						</TableBody>
					</Table>
				</div>

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
		<div className="flex flex-wrap items-center gap-2 py-4">
			<Input
				placeholder="Search by name, email…"
				value={searchInput}
				onChange={(event) => onSearchInputChange(event.target.value)}
				className="h-8 w-64"
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
				<SelectTrigger className="h-8 w-44">
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
					className="h-8 px-2 text-muted-foreground"
				>
					<X className="mr-1 h-3.5 w-3.5" />
					Reset
				</Button>
			)}
		</div>
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
		return <SkeletonRows columns={colSpan} rows={pageSize} />;
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
				<TableCell key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	));
}

function SkeletonRows({ columns, rows }: { columns: number; rows: number }) {
	const rowKeys = Array.from(
		{ length: Math.min(rows, 10) },
		(_, rowIndex) => `skeleton-row-${rowIndex}`,
	);
	const columnKeys = Array.from(
		{ length: columns },
		(_, columnIndex) => `skeleton-column-${columnIndex}`,
	);

	return (
		<>
			{rowKeys.map((rowKey) => (
				<TableRow key={rowKey}>
					{columnKeys.map((columnKey) => (
						<TableCell key={columnKey}>
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
