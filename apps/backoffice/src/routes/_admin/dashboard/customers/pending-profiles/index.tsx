import { createFileRoute } from "@tanstack/react-router";
import {
	PendingCustomerProfilesPage,
	PendingProfilesTableSkeleton,
} from "@/modules/customers/review-customer-onboarding/PendingCustomerProfilesPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/customers/pending-profiles/",
)({
	pendingComponent: PendingProfilesTableSkeleton,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar las altas de cliente."
			forbiddenMessage="No tienes permisos para revisar las altas de cliente."
		/>
	),
	component: PendingCustomerProfilesPage,
});
