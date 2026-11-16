import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { reportWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import { reportDestinations } from "@/components/dashboard-navigation";
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
	const { user } = Route.useRouteContext();
	return (
		<div className="min-w-0 space-y-4">
			<h1 className="text-xl font-semibold tracking-tight">Reportes</h1>
			<nav
				aria-label="Reportes"
				className="flex gap-1 overflow-x-auto border-b"
			>
				{reportDestinations
					.filter((item) => item.isVisible(user.permissions))
					.map((item) => (
						<Link
							key={item.href}
							to={item.href}
							preload={false}
							activeOptions={{ includeSearch: false }}
							className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-[current=page]:border-blue-600 aria-[current=page]:text-blue-700"
						>
							{item.name}
						</Link>
					))}
			</nav>
			<Outlet />
		</div>
	);
}
