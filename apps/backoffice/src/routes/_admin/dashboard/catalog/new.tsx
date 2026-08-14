import { createFileRoute } from "@tanstack/react-router";
import { CreateProductPage } from "@/modules/products/create-product/CreateProductPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/catalog/new")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el formulario para crear el producto."
				forbiddenMessage="No tienes permisos para crear productos."
			/>
		);
	},
	component: CreateProductPage,
});
