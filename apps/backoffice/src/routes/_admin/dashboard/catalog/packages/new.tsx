import { createFileRoute } from "@tanstack/react-router";
import { CreatePackagePage } from "@/modules/products/create-package/CreatePackagePage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/catalog/packages/new")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el formulario para crear el paquete."
				forbiddenMessage="No tienes permisos para crear paquetes."
			/>
		);
	},
	component: CreatePackagePage,
});
