import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CreateComboPage } from "@/modules/products/create-combo/CreateComboPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const createComboSearchSchema = z.object({
	equipmentTypeId: z.string().trim().min(1).optional(),
});

export const Route = createFileRoute("/_admin/dashboard/catalog/packages/new")({
	validateSearch: createComboSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el formulario para crear el combo."
				forbiddenMessage="No tienes permisos para crear combos."
			/>
		);
	},
	component: CreateComboRoute,
});

function CreateComboRoute() {
	const { equipmentTypeId } = Route.useSearch();
	return <CreateComboPage equipmentTypeId={equipmentTypeId} />;
}
