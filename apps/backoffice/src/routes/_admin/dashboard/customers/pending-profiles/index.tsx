import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { PendingCustomerProfilesPage } from "@/modules/customers/review-customer-onboarding/PendingCustomerProfilesPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/customers/pending-profiles/",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.CustomersOnboardingManage),
		);
	},

	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar las altas de cliente."
			forbiddenMessage="No tienes permisos para revisar las altas de cliente."
		/>
	),
	component: PendingCustomerProfilesPage,
});
