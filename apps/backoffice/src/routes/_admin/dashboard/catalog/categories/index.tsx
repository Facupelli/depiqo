import { createFileRoute } from "@tanstack/react-router";
import { CategoriesPage } from "@/modules/settings/categories/list-categories/CategoriesPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

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
