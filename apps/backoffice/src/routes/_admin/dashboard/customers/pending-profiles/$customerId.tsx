import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import {
	CustomerOnboardingReviewPage,
	CustomerProfileReviewPageSkeleton,
} from "@/modules/customers/review-customer-onboarding/CustomerOnboardingReviewPage";
import { customerOnboardingProfileQueries } from "@/modules/customers/review-customer-onboarding/customer-onboarding-profile.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/customers/pending-profiles/$customerId",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.CustomersOnboardingManage),
		);
	},

	loader: ({ context: { queryClient }, params: { customerId } }) =>
		queryClient.ensureQueryData(
			customerOnboardingProfileQueries.detail(customerId),
		),
	pendingComponent: CustomerProfileReviewPageSkeleton,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el expediente del cliente."
			forbiddenMessage="No tienes permisos para revisar este expediente."
		/>
	),
	component: CustomerOnboardingReviewRoute,
});

function CustomerOnboardingReviewRoute() {
	const { customerId } = Route.useParams();

	return <CustomerOnboardingReviewPage customerId={customerId} />;
}
