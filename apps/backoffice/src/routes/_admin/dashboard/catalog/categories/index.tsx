import { createFileRoute } from "@tanstack/react-router";
import { useCategories } from "@/features/tenant-management/categories/categories.queries";
import { CategoriesTable } from "@/features/tenant-management/categories/components/categories-table";
import { CreateCategoryDialog } from "@/features/tenant-management/categories/create-category/create-category-dialog";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";

export const Route = createFileRoute("/_admin/dashboard/catalog/categories/")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el catálogo de categorías."
				forbiddenMessage="No tienes permisos para ver las categorías."
			/>
		);
	},
	component: CategoriesPage,
});

function CategoriesPage() {
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
