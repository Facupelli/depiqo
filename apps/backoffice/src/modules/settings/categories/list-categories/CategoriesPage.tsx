import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCategories } from "../categories.queries";
import { CreateCategoryDialog } from "../create-category/create-category-dialog";
import { CategoriesTable } from "./CategoriesTable";

export function CategoriesPage() {
	const { data: categories = [], isFetching, isError } = useCategories();
	const timezone = useTenantTimezone();

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<h1 className="sr-only">Categorías</h1>
				<div className="ml-auto">
					<CreateCategoryDialog />
				</div>
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
