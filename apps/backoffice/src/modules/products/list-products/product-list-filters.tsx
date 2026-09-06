import type {
	CategoryDto,
	GetBranchesBranchDto,
	GetRentableItemsQueryDto,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useId } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { BranchScopeSelect } from "@/components/branch-scope-select";

type ProductKind = NonNullable<GetRentableItemsQueryDto["kind"]>;
type ProductStatus = NonNullable<GetRentableItemsQueryDto["status"]>;
type BooleanFilterValue = boolean | undefined;

export interface ProductListFilterValue {
	search?: string;
	kind?: Extract<ProductKind, "SINGLE" | "PACKAGE">;
	status?: ProductStatus;
	categoryId?: string;
	branchId?: string;
	branchScope?: "all";
	isVisible?: boolean;
	isRentable?: boolean;
	hasActivePricing?: boolean;
}

interface ProductListFiltersProps {
	filters: ProductListFilterValue;
	searchValue: string;
	categories: CategoryDto[];
	branches: GetBranchesBranchDto[];
	inheritedBranchId: string | null;
	showBranchFilter: boolean;
	isAdvancedOpen: boolean;
	onSearchChange: (value: string) => void;
	onFilterChange: (filters: Partial<ProductListFilterValue>) => void;
	onBranchChange: (branch: BranchScopeFilter) => void;
	onToggleAdvanced: () => void;
	onClearFilters: () => void;
}

const STATUS_LABELS: Record<ProductStatus, string> = {
	ACTIVE: "Active",
	DRAFT: "Draft",
	ARCHIVED: "Archived",
};

const KIND_LABELS: Record<
	Extract<ProductKind, "SINGLE" | "PACKAGE">,
	string
> = {
	SINGLE: "Equipment",
	PACKAGE: "Combo",
};

const BOOLEAN_FILTER_LABELS = {
	isVisible: {
		true: "Visible in catalog",
		false: "Hidden from catalog",
	},
	isRentable: {
		true: "Rentable",
		false: "Not rentable",
	},
	hasActivePricing: {
		true: "Has active pricing",
		false: "Needs setup",
	},
} as const;

export function ProductListFilters({
	filters,
	searchValue,
	categories,
	branches,
	inheritedBranchId,
	showBranchFilter,
	isAdvancedOpen,
	onSearchChange,
	onFilterChange,
	onBranchChange,
	onToggleAdvanced,
	onClearFilters,
}: ProductListFiltersProps) {
	const searchInputId = useId();
	const activeChips = buildActiveChips(
		filters,
		categories,
		branches,
		showBranchFilter,
	);

	return (
		<section className="rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs">
			<div className="flex flex-wrap gap-2">
				<SavedViewPill
					label="Activos"
					isActive={filters.status === "ACTIVE"}
					onClick={() =>
						onFilterChange({
							kind: undefined,
							status: "ACTIVE",
							hasActivePricing: undefined,
						})
					}
				/>
				<SavedViewPill
					label="Borradores"
					isActive={filters.status === "DRAFT"}
					onClick={() =>
						onFilterChange({
							kind: undefined,
							status: "DRAFT",
							hasActivePricing: undefined,
						})
					}
				/>
				<SavedViewPill
					label="Combos"
					isActive={filters.kind === "PACKAGE"}
					onClick={() =>
						onFilterChange({
							kind: "PACKAGE",
							status: undefined,
							hasActivePricing: undefined,
						})
					}
				/>
				<SavedViewPill
					label="Needs setup"
					isActive={filters.hasActivePricing === false}
					onClick={() =>
						onFilterChange({
							kind: undefined,
							status: undefined,
							hasActivePricing: false,
						})
					}
				/>
				<SavedViewPill
					label="Archivados"
					isActive={filters.status === "ARCHIVED"}
					onClick={() =>
						onFilterChange({
							kind: undefined,
							status: "ARCHIVED",
							hasActivePricing: undefined,
						})
					}
				/>
			</div>

			<div
				className={
					showBranchFilter
						? "mt-3 grid gap-2 lg:grid-cols-[minmax(280px,1fr)_160px_160px_auto] lg:items-center"
						: "mt-3 grid gap-2 lg:grid-cols-[minmax(280px,1fr)_160px_auto] lg:items-center"
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

				<CompactSelect
					value={filters.categoryId}
					placeholder="Categoría"
					allLabel="All"
					onValueChange={(categoryId) => onFilterChange({ categoryId })}
					options={categories.map((category) => ({
						label: category.name,
						value: category.id,
					}))}
				/>

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

				<Button
					variant="outline"
					size="sm"
					className="h-9 rounded-sm px-4"
					onClick={onToggleAdvanced}
				>
					<SlidersHorizontal className="mr-2 h-4 w-4" />
					Filters
				</Button>
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
						Clear all
					</button>
				</div>
			) : null}

			{isAdvancedOpen ? (
				<div className="mt-3 grid gap-3 rounded-sm border border-border/60 bg-muted/20 p-3 md:grid-cols-3">
					<BooleanSegment
						label="Catalog visibility"
						value={filters.isVisible}
						trueLabel="Visible"
						falseLabel="Hidden"
						onChange={(isVisible) => onFilterChange({ isVisible })}
					/>
					<BooleanSegment
						label="Rental status"
						value={filters.isRentable}
						trueLabel="Rentable"
						falseLabel="Not rentable"
						onChange={(isRentable) => onFilterChange({ isRentable })}
					/>
					<BooleanSegment
						label="Pricing"
						value={filters.hasActivePricing}
						trueLabel="Priced"
						falseLabel="Needs setup"
						onChange={(hasActivePricing) =>
							onFilterChange({ hasActivePricing })
						}
					/>
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

function BooleanSegment({
	label,
	value,
	trueLabel,
	falseLabel,
	onChange,
}: {
	label: string;
	value: BooleanFilterValue;
	trueLabel: string;
	falseLabel: string;
	onChange: (value: BooleanFilterValue) => void;
}) {
	return (
		<div className="space-y-2">
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</span>
			<div className="flex flex-wrap gap-1.5">
				<SavedViewPill
					label="All"
					isActive={value === undefined}
					onClick={() => onChange(undefined)}
				/>
				<SavedViewPill
					label={trueLabel}
					isActive={value === true}
					onClick={() => onChange(true)}
				/>
				<SavedViewPill
					label={falseLabel}
					isActive={value === false}
					onClick={() => onChange(false)}
				/>
			</div>
		</div>
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
				<span className="sr-only">Remove {label}</span>
				<X className="h-3 w-3" />
			</button>
		</span>
	);
}

function buildActiveChips(
	filters: ProductListFilterValue,
	categories: CategoryDto[],
	branches: GetBranchesBranchDto[],
	showBranchFilter: boolean,
): Array<{ key: keyof ProductListFilterValue; label: string }> {
	const category = categories.find((item) => item.id === filters.categoryId);
	const branch = showBranchFilter
		? branches.find((item) => item.id === filters.branchId)
		: undefined;
	const chips: Array<{ key: keyof ProductListFilterValue; label: string }> = [];

	if (filters.search) {
		chips.push({ key: "search", label: `Search: ${filters.search}` });
	}
	if (filters.kind) {
		chips.push({ key: "kind", label: KIND_LABELS[filters.kind] });
	}
	if (filters.status && filters.status !== "ACTIVE") {
		chips.push({ key: "status", label: STATUS_LABELS[filters.status] });
	}
	if (category) {
		chips.push({ key: "categoryId", label: category.name });
	}
	if (branch) {
		chips.push({ key: "branchId", label: branch.name });
	} else if (showBranchFilter && filters.branchScope === "all") {
		chips.push({ key: "branchScope", label: "Todas las sucursales" });
	}
	if (filters.isVisible !== undefined) {
		chips.push({
			key: "isVisible",
			label:
				BOOLEAN_FILTER_LABELS.isVisible[
					String(filters.isVisible) as "true" | "false"
				],
		});
	}
	if (filters.isRentable !== undefined) {
		chips.push({
			key: "isRentable",
			label:
				BOOLEAN_FILTER_LABELS.isRentable[
					String(filters.isRentable) as "true" | "false"
				],
		});
	}
	if (filters.hasActivePricing !== undefined) {
		chips.push({
			key: "hasActivePricing",
			label:
				BOOLEAN_FILTER_LABELS.hasActivePricing[
					String(filters.hasActivePricing) as "true" | "false"
				],
		});
	}

	return chips;
}
