import { createFileRoute, Outlet } from "@tanstack/react-router";
import { reportWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import { branchQueries } from "@/modules/settings/branches/public";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/reports")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, reportWorkspacePermissions),
		);
	},
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(branchQueries.list()),
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el reporte."
			forbiddenMessage="No tienes permisos para ver este reporte."
		/>
	),
	component: ReportsLayout,
});

function ReportsLayout() {
	return (
		<div className="min-w-0">
			<h1 className="sr-only">Reportes</h1>
			<Outlet />
		</div>
	);
}
