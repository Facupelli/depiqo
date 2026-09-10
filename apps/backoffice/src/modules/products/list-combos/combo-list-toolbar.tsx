import type { CategoryDto, GetBranchesBranchDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useDebouncer } from "@tanstack/react-pacer";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useId, useState } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { BranchScopeSelect } from "@/components/branch-scope-select";
import type { CombosSearch } from "./CombosPage";

const ALL = "all";
const ALL_STATUSES = "ALL";
const statusItems = [
	{ label: "Todos", value: ALL_STATUSES },
	{ label: "Activos", value: "ACTIVE" },
	{ label: "Borradores", value: "DRAFT" },
	{ label: "Archivados", value: "ARCHIVED" },
];

export type SearchCommit = {
	value: string;
	basedOnAppliedValue: string;
};

type SearchDraft = SearchCommit;

interface ComboListToolbarProps {
	filters: CombosSearch;
	appliedSearchValue: string;
	categories: CategoryDto[];
	branches: GetBranchesBranchDto[];
	inheritedBranchId: string | null;
	showBranchFilter: boolean;
	onSearchCommit: (commit: SearchCommit) => void;
	onFilterChange: (filters: Partial<CombosSearch>) => void;
	onBranchChange: (branch: BranchScopeFilter) => void;
	onClearFilters: () => void;
}

export function ComboListToolbar({
	filters,
	appliedSearchValue,
	categories,
	branches,
	inheritedBranchId,
	showBranchFilter,
	onSearchCommit,
	onFilterChange,
	onBranchChange,
	onClearFilters,
}: ComboListToolbarProps) {
	const searchInputId = useId();
	const navigate = useNavigate();
	const searchDebouncer = useDebouncer(onSearchCommit, { wait: 300 });
	const [searchDraft, setSearchDraft] = useState<SearchDraft>({
		value: appliedSearchValue,
		basedOnAppliedValue: appliedSearchValue,
	});
	const visibleSearchValue =
		searchDraft.basedOnAppliedValue === appliedSearchValue
			? searchDraft.value
			: appliedSearchValue;
	const hasFilters = Boolean(
		visibleSearchValue ||
			filters.search ||
			filters.status !== "ACTIVE" ||
			filters.categoryId ||
			filters.branchId ||
			filters.branchScope,
	);
	const categoryItems = [
		{ label: "Todas", value: ALL },
		...categories.map((category) => ({
			label: category.name,
			value: category.id,
		})),
	];

	return (
		<section className="rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs">
			<div
				className={
					showBranchFilter
						? "grid gap-x-2 gap-y-3 @md/combo-index:grid-cols-2 @5xl/combo-index:grid-cols-[minmax(240px,1fr)_160px_180px_180px_auto] @5xl/combo-index:items-center"
						: "grid gap-2 @md/combo-index:grid-cols-2 @5xl/combo-index:grid-cols-[minmax(240px,1fr)_160px_180px_auto] @5xl/combo-index:items-center"
				}
			>
				<div className="relative @md/combo-index:col-span-2 @5xl/combo-index:col-span-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						id={searchInputId}
						type="search"
						placeholder="Buscar por nombre"
						value={visibleSearchValue}
						className="h-9 rounded-sm border-border/70 bg-muted/20 pl-9 shadow-none"
						onChange={(event) => {
							const nextDraft = {
								value: event.target.value,
								basedOnAppliedValue: appliedSearchValue,
							};
							setSearchDraft(nextDraft);
							searchDebouncer.maybeExecute(nextDraft);
						}}
					/>
				</div>

				<Select
					value={filters.status}
					items={statusItems}
					onValueChange={(value) =>
						onFilterChange({
							status: value as CombosSearch["status"],
						})
					}
				>
					<SelectTrigger className="h-9 w-full rounded-sm border-border/70 bg-background px-4 shadow-none">
						<span className="mr-1 text-muted-foreground text-xs">Estado</span>
						<SelectValue placeholder="Todos" />
					</SelectTrigger>
					<SelectContent>
						{statusItems.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={filters.categoryId ?? ALL}
					items={categoryItems}
					onValueChange={(value) =>
						onFilterChange({
							categoryId: value === ALL ? undefined : (value ?? undefined),
						})
					}
				>
					<SelectTrigger className="h-9 w-full rounded-sm border-border/70 bg-background px-4 shadow-none">
						<span className="mr-1 text-muted-foreground text-xs">
							Categoría
						</span>
						<SelectValue placeholder="Todas" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todas</SelectItem>
						{categories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{showBranchFilter && (
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
				)}

				<div
					className={
						showBranchFilter
							? "@md/combo-index:justify-self-end @5xl/combo-index:col-span-1"
							: "@md/combo-index:col-span-2 @md/combo-index:justify-self-end @5xl/combo-index:col-span-1"
					}
				>
					<Button
						onClick={() => navigate({ to: "/dashboard/catalog/packages/new" })}
					>
						<Plus className="mr-2 size-4" />
						Nuevo combo
					</Button>
				</div>
			</div>

			{hasFilters ? (
				<button
					type="button"
					className="mt-3 inline-flex items-center text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
					onClick={() => {
						searchDebouncer.cancel();
						setSearchDraft({
							value: "",
							basedOnAppliedValue: appliedSearchValue,
						});
						onClearFilters();
					}}
				>
					<X className="mr-1 size-3" />
					Limpiar filtros
				</button>
			) : null}
		</section>
	);
}
