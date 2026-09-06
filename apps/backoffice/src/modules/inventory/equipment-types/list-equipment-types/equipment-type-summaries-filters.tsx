import type { GetBranchesBranchDto } from "@repo/api-contracts";
import { Input } from "@repo/ui/components/input";
import { Search, X } from "lucide-react";
import { useId } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { BranchScopeSelect } from "@/components/branch-scope-select";

export interface EquipmentTypeSummariesFilterValue {
	search?: string;
	branchId?: string;
	branchScope?: "all";
}

interface EquipmentTypeSummariesFiltersProps {
	filters: EquipmentTypeSummariesFilterValue;
	searchValue: string;
	branches: GetBranchesBranchDto[];
	inheritedBranchId: string | null;
	showBranchFilter: boolean;
	onSearchChange: (value: string) => void;
	onFilterChange: (filters: Partial<EquipmentTypeSummariesFilterValue>) => void;
	onBranchChange: (branch: BranchScopeFilter) => void;
	onClearFilters: () => void;
}

export function EquipmentTypeSummariesFilters({
	filters,
	searchValue,
	branches,
	inheritedBranchId,
	showBranchFilter,
	onSearchChange,
	onFilterChange,
	onBranchChange,
	onClearFilters,
}: EquipmentTypeSummariesFiltersProps) {
	const searchInputId = useId();
	const activeChips = buildActiveChips(filters, branches, showBranchFilter);

	return (
		<section className="rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs">
			<div
				className={
					showBranchFilter
						? "grid gap-2 lg:grid-cols-[minmax(280px,1fr)_180px_auto] lg:items-center"
						: "grid gap-2 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center"
				}
			>
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						id={searchInputId}
						type="search"
						placeholder="Buscar por nombre"
						value={searchValue}
						className="h-9 rounded-sm border-border/70 bg-muted/20 pl-9 shadow-none"
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>

				{showBranchFilter ? (
					<BranchScopeSelect
						value={
							filters.branchId
								? { type: "branch", branchId: filters.branchId }
								: filters.branchScope === "all"
									? { type: "all" }
									: { type: "inherit" }
						}
						branches={branches}
						inheritedBranchId={inheritedBranchId}
						onChange={onBranchChange}
						className="h-9 w-full rounded-sm border-border/70 bg-background px-4 shadow-none"
					/>
				) : null}
			</div>

			{activeChips.length > 0 ? (
				<div className="mt-3 flex flex-wrap items-center gap-2">
					{activeChips.map((chip) => (
						<ActiveFilterChip
							key={chip.key}
							label={chip.label}
							onRemove={() => {
								if (chip.key === "branchId" || chip.key === "branchScope") {
									onBranchChange({ type: "inherit" });
								} else {
									onFilterChange({ [chip.key]: undefined });
								}
							}}
						/>
					))}
					<button
						type="button"
						className="ml-1 text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
						onClick={onClearFilters}
					>
						Limpiar todo
					</button>
				</div>
			) : null}
		</section>
	);
}

function ActiveFilterChip({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) {
	return (
		<span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2.5 py-1 text-muted-foreground text-xs">
			{label}
			<button
				type="button"
				className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
				onClick={onRemove}
			>
				<span className="sr-only">Quitar {label}</span>
				<X className="h-3 w-3" />
			</button>
		</span>
	);
}

function buildActiveChips(
	filters: EquipmentTypeSummariesFilterValue,
	branches: GetBranchesBranchDto[],
	showBranchFilter: boolean,
): Array<{ key: keyof EquipmentTypeSummariesFilterValue; label: string }> {
	const branch = showBranchFilter
		? branches.find((item) => item.id === filters.branchId)
		: undefined;
	const chips: Array<{
		key: keyof EquipmentTypeSummariesFilterValue;
		label: string;
	}> = [];

	if (filters.search) {
		chips.push({ key: "search", label: `Búsqueda: ${filters.search}` });
	}
	if (branch) {
		chips.push({ key: "branchId", label: branch.name });
	} else if (showBranchFilter && filters.branchScope === "all") {
		chips.push({ key: "branchScope", label: "Todas las sucursales" });
	}

	return chips;
}
