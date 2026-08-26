import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCategories } from "../categories.queries";
import { CreateCategoryDialog } from "../create-category/create-category-dialog";
import { CategoriesTable } from "./CategoriesTable";

export function CategoriesPage() {
	const { data: categories = [], isFetching, isError } = useCategories();
	const timezone = useTenantTimezone();

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona la taxonomía compartida para equipos e ítems rentables.
					</p>
				</div>

				<CreateCategoryDialog />
			</div>

			{isError ? (
				<p className="text-sm text-destructive">
					No pudimos cargar las categorías. Inténtalo nuevamente.
				</p>
			) : (
				<CategoriesTable
					categories={categories}
					isLoading={isFetching}
					timezone={timezone}
				/>
			)}
		</div>
	);
}
