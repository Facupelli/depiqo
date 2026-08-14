import type {
	GetRentalsDateLensDto,
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
import {
	getRentalOrderStatusLabel,
	RENTAL_ORDER_STATUS_OPTIONS,
} from "../../rental-order-status";
import { useRentalOrdersList } from "./rental-orders-list.context";

const ALL_VALUE = "__ALL__";
const OPERATIONALLY_ACTIVE_STATUSES = ["CONFIRMED", "PREPARED"] as const;
const DATE_LENS_OPTIONS: Array<{
	value: GetRentalsDateLensDto;
	label: string;
}> = [
	{ value: "TODAY", label: "Hoy" },
	{ value: "UPCOMING", label: "Próximos" },
	{ value: "ACTIVE", label: "Activos" },
	{ value: "PAST", label: "Pasados" },
];

export function RentalOrdersToolbar() {
	const {
		search,
		branches,
		hasActiveFilters,
		setDateLens,
		setStatuses,
		setBranch,
		resetFilters,
	} = useRentalOrdersList();
	const selectedStatuses = search.statuses ?? [];
	const effectiveStatuses =
		selectedStatuses.length > 0
			? selectedStatuses
			: RENTAL_ORDER_STATUS_OPTIONS;
	const statusLabel = getStatusFilterLabel(selectedStatuses);

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
		<div className="flex flex-wrap items-center gap-3">
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

			<Select
				value={search.branchId ?? ALL_VALUE}
				onValueChange={(value) =>
					setBranch(!value || value === ALL_VALUE ? undefined : value)
				}
				items={[
					{ value: ALL_VALUE, label: "Todas las ubicaciones" },
					...branches.map((branch) => ({
						value: branch.id,
						label: branch.name,
					})),
				]}
			>
				<SelectTrigger className="h-9 w-full sm:w-52">
					<SelectValue placeholder="Ubicación" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>Todas las ubicaciones</SelectItem>
					{branches.map((branch) => (
						<SelectItem key={branch.id} value={branch.id}>
							{branch.name}
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
		</div>
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
