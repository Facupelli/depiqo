import type {
	GetRentalsDateLensDto,
	GetRentalsSortByDto,
	GetRentalsSortDirectionDto,
	GetRentalsStatusDto,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { BranchScopeSelect } from "@/components/branch-scope-select";
import {
	getRentalOrderStatusLabel,
	RENTAL_ORDER_STATUS_OPTIONS,
} from "@/modules/rentals/shared/rental-order-status";
import {
	getEffectiveRentalOrdersSort,
	useRentalOrdersList,
} from "./rental-orders-list.context";

const ALL_VALUE = "__ALL__";
const OPERATIONALLY_ACTIVE_STATUSES = ["CONFIRMED"] as const;
const SORT_OPTIONS: Array<{
	value: `${GetRentalsSortByDto}:${GetRentalsSortDirectionDto}`;
	label: string;
	sortBy: GetRentalsSortByDto;
	sortDirection: GetRentalsSortDirectionDto;
}> = [
	{
		value: "pickupDate:asc",
		label: "Retira - ascendente",
		sortBy: "pickupDate",
		sortDirection: "asc",
	},
	{
		value: "pickupDate:desc",
		label: "Retira - descendente",
		sortBy: "pickupDate",
		sortDirection: "desc",
	},
	{
		value: "returnDate:asc",
		label: "Devuelve - ascendente",
		sortBy: "returnDate",
		sortDirection: "asc",
	},
	{
		value: "returnDate:desc",
		label: "Devuelve - descendente",
		sortBy: "returnDate",
		sortDirection: "desc",
	},
	{
		value: "createdAt:asc",
		label: "Creado - ascendente",
		sortBy: "createdAt",
		sortDirection: "asc",
	},
	{
		value: "createdAt:desc",
		label: "Creado - descendente",
		sortBy: "createdAt",
		sortDirection: "desc",
	},
];

const DATE_LENS_OPTIONS: Array<{
	value: GetRentalsDateLensDto;
	label: string;
}> = [
	{ value: "TODAY", label: "Hoy" },
	{ value: "UPCOMING", label: "Próximos" },
	{ value: "ACTIVE", label: "Activos" },
	{ value: "PAST", label: "Pasados" },
];

interface RentalOrdersToolbarProps {
	toolbarActions?: ReactNode;
}

export function RentalOrdersToolbar({
	toolbarActions,
}: RentalOrdersToolbarProps) {
	const {
		search,
		branches,
		hasActiveFilters,
		inheritedBranchId,
		setDateLens,
		setStatuses,
		setBranch,
		resetFilters,
		setSort,
	} = useRentalOrdersList();
	const currentSort = getEffectiveRentalOrdersSort(search);
	const selectedStatuses = search.statuses ?? [];
	const effectiveStatuses =
		selectedStatuses.length > 0
			? selectedStatuses
			: RENTAL_ORDER_STATUS_OPTIONS;
	const statusLabel = getStatusFilterLabel(selectedStatuses);
	const branchScopeValue: BranchScopeFilter = search.branchId
		? { type: "branch", branchId: search.branchId }
		: search.branchScope === "all"
			? { type: "all" }
			: { type: "inherit" };

	function changeStatuses(statuses?: GetRentalsStatusDto[]) {
		setStatuses(normalizeStatusesFilter(statuses));
	}

	function toggleStatus(status: GetRentalsStatusDto) {
		const next = effectiveStatuses.includes(status)
			? effectiveStatuses.filter((selected) => selected !== status)
			: [...effectiveStatuses, status];

		changeStatuses(next);
	}

	return (
		<section className="flex flex-wrap items-center gap-3 rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs">
			<Select
				value={search.dateLens ?? ALL_VALUE}
				onValueChange={(value) =>
					setDateLens(
						value === ALL_VALUE ? undefined : (value as GetRentalsDateLensDto),
					)
				}
				items={[
					{ value: ALL_VALUE, label: "Todas las fechas" },
					...DATE_LENS_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label,
					})),
				]}
			>
				<SelectTrigger className="h-9 w-full sm:w-40">
					<SelectValue placeholder="Fecha" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>Todas las fechas</SelectItem>
					{DATE_LENS_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Popover>
				<PopoverTrigger
					render={
						<Button
							variant="outline"
							className="h-9 w-full justify-between font-normal sm:w-52"
						>
							<span className="truncate">{statusLabel}</span>
							<ChevronDown className="ml-2 size-4 opacity-50" />
						</Button>
					}
				/>
				<PopoverContent align="start" className="w-72 gap-3 p-3">
					<div className="grid grid-cols-2 gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => changeStatuses(undefined)}
						>
							Todos
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() =>
								changeStatuses(
									RENTAL_ORDER_STATUS_OPTIONS.filter(
										(status) => status !== "CANCELLED",
									),
								)
							}
						>
							Sin cancelados
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="col-span-2"
							onClick={() => changeStatuses([...OPERATIONALLY_ACTIVE_STATUSES])}
						>
							Operativamente activos
						</Button>
					</div>

					<div className="space-y-1 border-t pt-3">
						{RENTAL_ORDER_STATUS_OPTIONS.map((status) => {
							const optionId = `rental-order-status-${status}`;

							return (
								<label
									key={status}
									htmlFor={optionId}
									className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
								>
									<Checkbox
										id={optionId}
										checked={effectiveStatuses.includes(status)}
										onCheckedChange={() => toggleStatus(status)}
									/>
									<span>{getRentalOrderStatusLabel(status)}</span>
								</label>
							);
						})}
					</div>
				</PopoverContent>
			</Popover>

			{branches.length === 1 ? null : (
				<BranchScopeSelect
					value={branchScopeValue}
					branches={branches}
					inheritedBranchId={inheritedBranchId}
					onChange={setBranch}
					className="h-9 w-full sm:w-52"
				/>
			)}

			<Select
				value={`${currentSort.sortBy}:${currentSort.sortDirection}`}
				onValueChange={(value) => {
					const selectedOption = SORT_OPTIONS.find(
						(option) => option.value === value,
					);
					if (!selectedOption) return;

					setSort(selectedOption.sortBy, selectedOption.sortDirection);
				}}
				items={SORT_OPTIONS}
			>
				<SelectTrigger
					className="h-9 w-full @sm/rentals-index:w-56 @5xl/rentals-index:hidden"
					aria-label="Ordenar pedidos"
				>
					<SelectValue placeholder="Ordenar" />
				</SelectTrigger>
				<SelectContent>
					{SORT_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{hasActiveFilters ? (
				<Button
					variant="ghost"
					size="sm"
					onClick={resetFilters}
					className="h-9 px-2 text-muted-foreground"
				>
					<X className="mr-1 h-4 w-4" />
					Limpiar
				</Button>
			) : null}

			{toolbarActions ? (
				<div className="ml-auto flex shrink-0 justify-end">
					{toolbarActions}
				</div>
			) : null}
		</section>
	);
}

function normalizeStatusesFilter(
	statuses?: GetRentalsStatusDto[],
): GetRentalsStatusDto[] | undefined {
	if (
		!statuses?.length ||
		statuses.length === RENTAL_ORDER_STATUS_OPTIONS.length
	) {
		return undefined;
	}

	return RENTAL_ORDER_STATUS_OPTIONS.filter((status) =>
		statuses.includes(status),
	);
}

function getStatusFilterLabel(statuses: GetRentalsStatusDto[]): string {
	if (statuses.length === 0) return "Todos los estados";
	if (statuses.length === 1) return getRentalOrderStatusLabel(statuses[0]);
	return `${statuses.length} estados`;
}
