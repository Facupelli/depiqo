import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { Link, useRouteContext } from "@tanstack/react-router";
import { customerDestinations } from "@/components/dashboard-navigation";

export function CustomerWorkspaceHeader({
	onboarding = false,
}: {
	onboarding?: boolean;
}) {
	const { user } = useRouteContext({ from: "/_admin/dashboard" });
	const customers = customerDestinations[0];
	const requests = customerDestinations[1];
	const canViewCustomers = customers.isVisible(user.permissions);
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="space-y-2">
				{onboarding ? (
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								{canViewCustomers ? (
									<BreadcrumbLink
										render={<Link to={customers.href}>Clientes</Link>}
									/>
								) : (
									<span>Clientes</span>
								)}
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Solicitudes de alta</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				) : null}
				<h1 className="text-xl font-semibold tracking-tight">
					{onboarding ? "Solicitudes de alta" : "Clientes"}
				</h1>
			</div>
			{onboarding ? (
				canViewCustomers ? (
					<Button
						nativeButton={false}
						variant="outline"
						render={<Link to={customers.href} />}
					>
						Volver a Clientes
					</Button>
				) : null
			) : requests.isVisible(user.permissions) ? (
				<Button
					nativeButton={false}
					variant="outline"
					render={<Link to={requests.href} />}
				>
					Solicitudes de alta
				</Button>
			) : null}
		</div>
	);
}
