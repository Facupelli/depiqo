import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { CreateBranchPage } from "@/modules/settings/branches/create-branch/CreateBranchPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/branches/new")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.BranchesManage),
		);
	},

	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la creación de sucursal."
				forbiddenMessage="No tienes permisos para crear sucursales."
			/>
		);
	},
	component: CreateBranchRoute,
});

function CreateBranchRoute() {
	const navigate = useNavigate();
	const goBackToBranches = () =>
		navigate({ to: "/dashboard/settings", search: { section: "branches" } });

	return (
		<CreateBranchPage onBack={goBackToBranches} onCreated={goBackToBranches} />
	);
}
