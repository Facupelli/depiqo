import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import type { RentalCatalogSearch } from "@/modules/catalog/rental-catalog-search";
import { useStorefrontCategories } from "@/modules/catalog/storefront-categories/storefront-categories.queries";
import { useStorefrontBranches } from "@/modules/tenant-management/branches/branches.queries";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { DateRangePicker } from "./date-range-picker";

interface RentalFiltersProps {
	search: RentalCatalogSearch;
	onBranchChange: (value: string) => void;
	setUrlParam: (patch: Partial<RentalCatalogSearch>) => void;
	onCategorySelect: (id: string) => void;
}

export function RentalFilters({
	search,
	onBranchChange,
	setUrlParam,
	onCategorySelect,
}: RentalFiltersProps) {
	const isMobile = useIsMobile();
	const { data: branches } = useStorefrontBranches();

	const activeFilterCount = [search.categoryId].filter(Boolean).length;

	return (
		<div className="pt-6">
			<div className="hidden md:block">
				<div className="dark rounded-2xl bg-background p-4">
					<div className="flex flex-wrap items-end gap-6">
						{/* Location */}
						<div className="flex flex-col gap-2">
							<p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
								Ubicación del rental
							</p>
							{branches?.length === 1 ? (
								<p className="flex h-10 w-72 items-center rounded-xl border border-border bg-muted px-3 text-foreground">
									{branches[0].name}
								</p>
							) : (
								<Select
									value={search.branchId}
									onValueChange={(value: string | null) => {
										if (value) onBranchChange(value);
									}}
									items={branches?.map((branch) => ({
										label: branch.name,
										value: branch.id,
									}))}
								>
									<SelectTrigger
										className="h-10! w-72 rounded-xl border-border bg-muted! hover:bg-muted/80! text-foreground"
										aria-label="Ubicacion del rental"
									>
										<SelectValue placeholder="Seleccionar ubicación" />
									</SelectTrigger>
									<SelectContent>
										{branches?.map((branch) => (
											<SelectItem key={branch.id} value={branch.id}>
												{branch.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>

						{/* Date range */}
						<div className="flex flex-col gap-2">
							<p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
								Periodo de alquiler
							</p>
							<DateRangePicker
								branchId={search.branchId}
								pickupDate={search.periodStart}
								returnDate={search.periodEnd}
								pickupInstant={search.pickupInstant}
								returnInstant={search.returnInstant}
								onChange={(period) => setUrlParam({ ...period, page: 1 })}
								numberOfMonths={2}
								buttonClassName="h-10 w-fit rounded-xl border border-border bg-muted px-8 hover:bg-muted/80"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3 md:hidden">
				{branches?.length === 1 ? (
					<p className="flex h-11 min-w-0 flex-1 items-center rounded-md border px-3">
						{branches[0].name}
					</p>
				) : (
					<Select
						value={search.branchId}
						onValueChange={(value: string | null) => {
							if (value) {
								onBranchChange(value);
							}
						}}
						items={branches?.map((branch) => ({
							label: branch.name,
							value: branch.id,
						}))}
					>
						<SelectTrigger
							className="h-11 min-w-0 flex-1"
							aria-label="Ubicacion del rental"
						>
							<SelectValue placeholder="Seleccionar ubicacion" />
						</SelectTrigger>
						<SelectContent>
							{branches?.map((branch) => (
								<SelectItem key={branch.id} value={branch.id}>
									{branch.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* ── Filters sheet button — mobile only ── */}
				{isMobile && (
					<div className="ml-auto md:hidden">
						<FiltersSheet
							search={search}
							setUrlParam={setUrlParam}
							onCategorySelect={onCategorySelect}
							activeFilterCount={activeFilterCount}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

interface FiltersSheetProps {
	search: RentalCatalogSearch;
	setUrlParam: (patch: Partial<RentalCatalogSearch>) => void;
	onCategorySelect: (id: string) => void;
	activeFilterCount: number;
}

function FiltersSheet({
	search,
	setUrlParam,
	onCategorySelect,
	activeFilterCount,
}: FiltersSheetProps) {
	const { data: categories } = useStorefrontCategories();

	return (
		<Sheet>
			<SheetTrigger
				render={
					<Button variant="outline" size="sm" className="relative gap-2">
						<SlidersHorizontal className="h-4 w-4" />
						Filtros
						{activeFilterCount > 0 && (
							<Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
								{activeFilterCount}
							</Badge>
						)}
					</Button>
				}
			/>

			<SheetContent
				side="bottom"
				className="rounded-t-2xl max-h-[85svh] overflow-y-auto border-neutral-700 bg-neutral-900 text-neutral-50"
			>
				<SheetHeader>
					<SheetTitle className="text-neutral-50">Filtros</SheetTitle>
				</SheetHeader>

				<div className="px-4 pb-6 space-y-6">
					<div className="space-y-2">
						<p className="text-sm font-semibold text-neutral-300">
							PERIODO DE ALQUILER
						</p>
						<DateRangePicker
							branchId={search.branchId}
							pickupDate={search.periodStart}
							returnDate={search.periodEnd}
							pickupInstant={search.pickupInstant}
							returnInstant={search.returnInstant}
							onChange={(period) => setUrlParam({ ...period, page: 1 })}
							numberOfMonths={1}
							buttonClassName="w-full justify-start bg-white/6 px-4 py-3 hover:bg-white/10"
							datesButtonClassName="text-neutral-400"
						/>
					</div>

					{categories && categories.length > 0 && (
						<div className="space-y-2">
							<p className="text-sm font-semibold text-neutral-300">
								CATEGORIA
							</p>
							<div className="flex flex-wrap gap-2">
								{categories.map((category) => (
									<Button
										key={category.id}
										variant={
											search.categoryId === category.id ? "default" : "outline"
										}
										size="sm"
										onClick={() => onCategorySelect(category.id)}
										className={cn(
											"rounded-full",
											search.categoryId !== category.id &&
												"border-neutral-700 bg-transparent text-neutral-50 hover:bg-white/10 hover:text-neutral-50",
										)}
									>
										{category.name}
									</Button>
								))}
							</div>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
