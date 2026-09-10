import { createFileRoute } from "@tanstack/react-router";
import { CreateIndividualRentalPage } from "@/modules/inventory/equipment-types/create-individual-rental/create-individual-rental-page";
import { equipmentTypeSummaryQueries } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-summary.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId/rentals_/new",
)({
	loader: ({ context: { queryClient }, params: { equipmentTypeId } }) =>
		queryClient.ensureQueryData(
			equipmentTypeSummaryQueries.summary(equipmentTypeId),
		),
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el formulario para crear el alquiler individual."
			forbiddenMessage="No tienes permisos para crear alquileres individuales."
		/>
	),
	component: CreateIndividualRentalRoute,
});

function CreateIndividualRentalRoute() {
	const { equipmentTypeId } = Route.useParams();
	return <CreateIndividualRentalPage equipmentTypeId={equipmentTypeId} />;
}
