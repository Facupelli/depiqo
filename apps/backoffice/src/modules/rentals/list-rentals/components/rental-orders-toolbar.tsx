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
		rentals,
		branches,
		hasActiveFilters,
		inheritedBranchId,
		setDateLens,
		setStatuses,
		setBranch,
		resetFilters,
		clearCustomer,
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

	const customerName = rentals.find(
		(rental) => rental.customer?.id === search.customerId,
	)?.customer?.displayName;

	return (
		<section aria-label="Filtros de alquileres" className="space-y-3">
			<div className="flex min-w-0 flex-wrap items-center gap-3">
				<Select
					value={search.dateLens ?? ALL_VALUE}
					onValueChange={(value) =>
						setDateLens(
							value === ALL_VALUE
								? undefined
								: (value as GetRentalsDateLensDto),
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
					<SelectTrigger
						aria-label="Fechas"
						className="h-10 w-full rounded-lg shadow-none @sm/rentals-index:w-44 pointer-coarse:min-h-11"
					>
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
								aria-label={`Estados: ${statusLabel}`}
								className="h-10 w-full justify-between rounded-lg font-normal shadow-none @sm/rentals-index:w-48 pointer-coarse:min-h-11"
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
								onClick={() =>
									changeStatuses([...OPERATIONALLY_ACTIVE_STATUSES])
								}
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
											aria-label={getRentalOrderStatusLabel(status)}
											checked={effectiveStatuses.includes(status)}
											disabled={
												effectiveStatuses.length === 1 &&
												effectiveStatuses.includes(status)
											}
											onCheckedChange={() => toggleStatus(status)}
										/>
										<span>{getRentalOrderStatusLabel(status)}</span>
									</label>
								);
							})}
						</div>
						<p className="border-t pt-2 text-xs leading-relaxed text-muted-foreground">
							Los filtros usan el estado guardado. Los períodos en curso o
							finalizados se muestran dentro de Confirmado.
						</p>
					</PopoverContent>
				</Popover>

				{branches.length === 1 ? null : (
					<BranchScopeSelect
						value={branchScopeValue}
						branches={branches}
						inheritedBranchId={inheritedBranchId}
						onChange={setBranch}
						className="h-10 w-full min-w-0 rounded-lg shadow-none @sm/rentals-index:w-60 pointer-coarse:min-h-11"
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
						className="h-10 w-full rounded-lg shadow-none @sm/rentals-index:w-56 @4xl/rentals-index:hidden pointer-coarse:min-h-11"
						aria-label="Ordenar alquileres"
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
						className="h-10 px-2 text-muted-foreground pointer-coarse:min-h-11"
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
			</div>
			{search.customerId ? (
				<div className="flex min-w-0">
					<Button
						variant="outline"
						size="sm"
						onClick={clearCustomer}
						aria-label={`Quitar filtro de cliente: ${customerName ?? search.customerId}`}
						className="h-auto min-h-8 max-w-full gap-2 rounded-md bg-muted/40 py-1.5 text-xs font-normal shadow-none pointer-coarse:min-h-11"
					>
						<span className="min-w-0 break-all whitespace-normal text-left">
							Cliente: {customerName ?? search.customerId}
						</span>
						<X className="size-3.5 shrink-0" />
					</Button>
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
