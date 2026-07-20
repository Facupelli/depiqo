import type {
	GetBranchesBranchDto,
	GetEquipmentTypeSummariesQueryDto,
} from "@repo/api-contracts";
import { Search, X } from "lucide-react";
import { useId } from "react";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";

export interface EquipmentTypeSummariesFilterValue {
	search?: string;
	isActive?: boolean;
	branchId?: string;
}

interface EquipmentTypeSummariesFiltersProps {
	filters: EquipmentTypeSummariesFilterValue;
	searchValue: string;
	branches: GetBranchesBranchDto[];
	onSearchChange: (value: string) => void;
	onFilterChange: (filters: Partial<GetEquipmentTypeSummariesQueryDto>) => void;
	onClearFilters: () => void;
}

const BOOLEAN_FILTER_LABELS = {
	isActive: {
		true: "Activo",
		false: "Inactivo",
	},
} as const;

export function EquipmentTypeSummariesFilters({
	filters,
	searchValue,
	branches,
	onSearchChange,
	onFilterChange,
	onClearFilters,
}: EquipmentTypeSummariesFiltersProps) {
	const searchInputId = useId();
	const activeChips = buildActiveChips(filters, branches);

	return (
		<section className="rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs">
			<div className="flex flex-wrap gap-2">
				<SavedViewPill
					label="Todos"
					isActive={filters.isActive === undefined}
					onClick={() => onFilterChange({ isActive: undefined })}
				/>
				<SavedViewPill
					label="Activos"
					isActive={filters.isActive === true}
					onClick={() => onFilterChange({ isActive: true })}
				/>
				<SavedViewPill
					label="Inactivos"
					isActive={filters.isActive === false}
					onClick={() => onFilterChange({ isActive: false })}
				/>
			</div>

			<div className="mt-3 grid gap-2 lg:grid-cols-[minmax(280px,1fr)_180px_auto] lg:items-center">
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

				<CompactSelect
					value={filters.branchId}
					placeholder="Sucursal"
					allLabel="Todas"
					onValueChange={(branchId) => onFilterChange({ branchId })}
					options={branches.map((branch) => ({
						label: branch.name,
						value: branch.id,
					}))}
				/>
			</div>

			{activeChips.length > 0 ? (
				<div className="mt-3 flex flex-wrap items-center gap-2">
					{activeChips.map((chip) => (
						<ActiveFilterChip
							key={chip.key}
							label={chip.label}
							onRemove={() => onFilterChange({ [chip.key]: undefined })}
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

function CompactSelect({
	value,
	placeholder,
	allLabel,
	options,
	onValueChange,
}: {
	value?: string;
	placeholder: string;
	allLabel: string;
	options: Array<{ label: string; value: string }>;
	onValueChange: (value: string | undefined) => void;
}) {
	const selectItems = [{ label: allLabel, value: "all" }, ...options];

	return (
		<Select
			value={value ?? "all"}
			items={selectItems}
			onValueChange={(nextValue) => {
				if (nextValue)
					onValueChange(nextValue === "all" ? undefined : nextValue);
			}}
		>
			<SelectTrigger className="h-9 w-full rounded-sm border-border/70 bg-background px-4 shadow-none">
				<span className="mr-1 text-muted-foreground text-xs">
					{placeholder}
				</span>
				<SelectValue placeholder={allLabel} />
			</SelectTrigger>
			<SelectContent>
				{selectItems.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function SavedViewPill({
	label,
	isActive,
	onClick,
}: {
	label: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={
				isActive
					? "rounded-sm bg-foreground px-3 py-1.5 font-medium text-background text-xs shadow-sm"
					: "rounded-sm border border-border/70 bg-muted/20 px-3 py-1.5 font-medium text-foreground/75 text-xs transition-colors hover:border-foreground/20 hover:bg-muted/60 hover:text-foreground"
			}
			onClick={onClick}
		>
			{label}
		</button>
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
): Array<{ key: keyof EquipmentTypeSummariesFilterValue; label: string }> {
	const branch = branches.find((item) => item.id === filters.branchId);
	const chips: Array<{
		key: keyof EquipmentTypeSummariesFilterValue;
		label: string;
	}> = [];

	if (filters.search) {
		chips.push({ key: "search", label: `Búsqueda: ${filters.search}` });
	}
	if (filters.isActive !== undefined) {
		chips.push({
			key: "isActive",
			label:
				BOOLEAN_FILTER_LABELS.isActive[
					String(filters.isActive) as "true" | "false"
				],
		});
	}
	if (branch) {
		chips.push({ key: "branchId", label: branch.name });
	}

	return chips;
}
