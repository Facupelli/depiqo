import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CreatePackagePage } from "@/modules/products/create-package/CreatePackagePage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const createPackageSearchSchema = z.object({
	equipmentTypeId: z.string().trim().min(1).optional(),
});

export const Route = createFileRoute("/_admin/dashboard/catalog/packages/new")({
	validateSearch: createPackageSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el formulario para crear el paquete."
				forbiddenMessage="No tienes permisos para crear paquetes."
			/>
		);
	},
	component: CreatePackageRoute,
});

function CreatePackageRoute() {
	const { equipmentTypeId } = Route.useSearch();
	return <CreatePackagePage equipmentTypeId={equipmentTypeId} />;
}
