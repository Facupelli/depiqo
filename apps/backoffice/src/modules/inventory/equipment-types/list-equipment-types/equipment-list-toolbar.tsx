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
import { useNavigate } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useId } from "react";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";
import { BranchScopeSelect } from "@/components/branch-scope-select";
import type { EquipmentTypesSearch } from "./EquipmentTypesPage";

const ALL_CATEGORIES = "all";

interface EquipmentListToolbarProps {
	filters: EquipmentTypesSearch;
	searchValue: string;
	categories: CategoryDto[];
	branches: GetBranchesBranchDto[];
	inheritedBranchId: string | null;
	showBranchFilter: boolean;
	onSearchChange: (value: string) => void;
	onFilterChange: (filters: Partial<EquipmentTypesSearch>) => void;
	onBranchChange: (branch: BranchScopeFilter) => void;
	onClearFilters: () => void;
}

export function EquipmentListToolbar({
	filters,
	searchValue,
	categories,
	branches,
	inheritedBranchId,
	showBranchFilter,
	onSearchChange,
	onFilterChange,
	onBranchChange,
	onClearFilters,
}: EquipmentListToolbarProps) {
	const searchInputId = useId();
	const navigate = useNavigate();
	const hasFilters = Boolean(
		filters.search ||
			filters.categoryId ||
			filters.branchId ||
			filters.branchScope,
	);
	const categoryItems = [
		{ label: "Todas", value: ALL_CATEGORIES },
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
						? "grid gap-2 @md/equipment-index:grid-cols-2 @3xl/equipment-index:grid-cols-[minmax(280px,1fr)_180px_180px_auto] @3xl/equipment-index:items-center"
						: "grid gap-2 @md/equipment-index:grid-cols-2 @3xl/equipment-index:grid-cols-[minmax(280px,1fr)_180px_auto] @3xl/equipment-index:items-center"
				}
			>
				<div className="relative @md/equipment-index:col-span-2 @3xl/equipment-index:col-span-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						id={searchInputId}
						type="search"
						placeholder="Buscar por nombre"
						value={searchValue}
						className="h-9 rounded-sm border-border/70 bg-muted/20 pl-9 shadow-none"
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>

				<Select
					value={filters.categoryId ?? ALL_CATEGORIES}
					items={categoryItems}
					onValueChange={(value) =>
						onFilterChange({
							categoryId: value && value !== ALL_CATEGORIES ? value : undefined,
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
						<SelectItem value={ALL_CATEGORIES}>Todas</SelectItem>
						{categories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

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

				<div className="@md/equipment-index:col-span-2 @3xl/equipment-index:col-span-1 @3xl/equipment-index:justify-self-end">
					<Button
						onClick={() =>
							navigate({ to: "/dashboard/inventory/equipment-types/new" })
						}
					>
						<Plus className="mr-2 size-4" />
						Nuevo equipo
					</Button>
				</div>
			</div>

			{hasFilters ? (
				<button
					type="button"
					className="mt-3 inline-flex items-center text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
					onClick={onClearFilters}
				>
					<X className="mr-1 size-3" />
					Limpiar filtros
				</button>
			) : null}
		</section>
	);
}
