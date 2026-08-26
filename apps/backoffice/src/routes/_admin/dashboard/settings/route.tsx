import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import {
	findSettingsNavItem,
	SettingsSecondaryNav,
} from "@/modules/settings/navigation/settings-secondary-nav";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/settings")({
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar la configuración."
			forbiddenMessage="No tienes permisos para ver la configuración."
		/>
	),
	component: SettingsLayout,
});

function SettingsLayout() {
	const pathname = useRouterState({
		select: ({ location }) => location.pathname,
	});
	const activeItem = findSettingsNavItem(pathname);

	return (
		<div className="grid h-full min-h-0 lg:grid-cols-[auto_minmax(0,1fr)]">
			<aside className="sticky top-0 hidden h-svh flex-col overflow-y-auto border-r border-gray-200 bg-background px-4 py-6 lg:flex lg:w-fit lg:max-w-72">
				<div className="px-3 pb-6">
					<h1 className="text-lg font-semibold tracking-tight">
						Configuración
					</h1>
					<p className="text-sm text-muted-foreground">
						Administra cómo opera y se presenta tu negocio.
					</p>
				</div>
				<SettingsSecondaryNav />
			</aside>
			<div className="h-full min-h-0 overflow-y-auto">
				<main className="min-w-0 space-y-6 p-8">
					{activeItem ? (
						<div className="space-y-2">
							<h2 className="text-2xl font-semibold tracking-tight">
								{activeItem.label}
							</h2>
							<p className="text-sm text-muted-foreground">
								{activeItem.description}
							</p>
						</div>
					) : null}
					<Outlet />
				</main>
			</div>
		</div>
	);
}
