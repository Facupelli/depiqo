import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, canAll, requireRouteAccess } from "@/auth/permissions";
import { customerProfileQueries } from "@/modules/customers/customer-profile/customer-profile.queries";
import {
	CustomerProfilePage,
	CustomerProfilePageSkeleton,
} from "@/modules/customers/customer-profile/customer-profile-page";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { getProblemDetailsStatus } from "@/shared/errors";

export const Route = createFileRoute("/_admin/dashboard/customers/$customerId")(
	{
		beforeLoad: ({ context }) =>
			requireRouteAccess(
				can(context.user.permissions, TenantPermission.CustomersRead),
			),
		loader: ({ context: { queryClient }, params: { customerId } }) =>
			queryClient.ensureQueryData(customerProfileQueries.detail(customerId)),
		pendingComponent: CustomerProfilePageSkeleton,
		errorComponent: ({ error }) =>
			getProblemDetailsStatus(error) === 404 ? (
				<div className="mx-auto max-w-6xl space-y-2 py-12">
					<h1 className="text-xl font-semibold">Cliente no encontrado</h1>
					<p className="text-sm text-muted-foreground">
						Este cliente no está disponible.
					</p>
				</div>
			) : (
				<AdminRouteError
					error={error}
					genericMessage="No pudimos cargar el perfil del cliente."
					forbiddenMessage="No tienes permisos para ver este cliente."
				/>
			),
		component: CustomerProfileRoute,
	},
);

function CustomerProfileRoute() {
	const { customerId } = Route.useParams();
	const { user } = Route.useRouteContext();
	return (
		<CustomerProfilePage
			key={customerId}
			customerId={customerId}
			canReadSensitive={canAll(user.permissions, [
				TenantPermission.CustomersRead,
				TenantPermission.CustomersSensitiveRead,
			])}
			canReadDocument={canAll(user.permissions, [
				TenantPermission.CustomersRead,
				TenantPermission.CustomersIdentityDocumentRead,
			])}
		/>
	);
}
