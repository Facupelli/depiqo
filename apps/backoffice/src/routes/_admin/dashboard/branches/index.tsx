import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BranchesPage } from "@/modules/settings/branches/list-branches/BranchesPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/branches/")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el catálogo de sucursales."
				forbiddenMessage="No tienes permisos para ver las sucursales."
			/>
		);
	},
	component: BranchesRoute,
});

function BranchesRoute() {
	const navigate = useNavigate();

	return (
		<BranchesPage
			onCreateBranch={() => navigate({ to: "/dashboard/branches/new" })}
			onEditBranch={(branchId) =>
				navigate({
					to: "/dashboard/branches/$branchId/edit",
					params: { branchId },
				})
			}
		/>
	);
}
