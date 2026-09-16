import { createFileRoute } from "@tanstack/react-router";
import { categoryWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import { CategoriesPage } from "@/modules/settings/categories/list-categories/CategoriesPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/catalog/categories/")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, categoryWorkspacePermissions),
		);
	},

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
