import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EditBranchPage } from "@/modules/settings/branches/edit-branch/EditBranchPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/branches/$branchId/edit",
)({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la edición de sucursal."
				forbiddenMessage="No tienes permisos para editar sucursales."
			/>
		);
	},
	component: EditBranchRoute,
});

function EditBranchRoute() {
	const { branchId } = Route.useParams();
	const navigate = useNavigate();
	const goBackToBranches = () =>
		navigate({ to: "/dashboard/settings", search: { section: "branches" } });

	return (
		<EditBranchPage
			branchId={branchId}
			onBack={goBackToBranches}
			onUpdated={goBackToBranches}
		/>
	);
}
