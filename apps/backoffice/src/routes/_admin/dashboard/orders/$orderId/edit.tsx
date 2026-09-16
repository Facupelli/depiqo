import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { EditRentalPage } from "@/modules/rentals/edit-rental/EditRentalPage";
import { RentalDetailPageSkeleton } from "@/modules/rentals/rental-detail/components/rental-detail-page-skeleton";
import { rentalDetailViewQueries } from "@/modules/rentals/rental-detail/rental-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/edit")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.RentalsProposalsManage),
		);
	},
	loader: async ({ context: { queryClient }, params: { orderId } }) => {
		await queryClient.ensureQueryData(rentalDetailViewQueries.detail(orderId));
	},
	pendingComponent: RentalDetailPageSkeleton,
	pendingMs: 0,
	pendingMinMs: 250,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el editor del pedido."
			forbiddenMessage="No tienes permisos para editar el pedido."
		/>
	),
	component: EditRentalRoute,
});

function EditRentalRoute() {
	const { orderId } = Route.useParams();

	return <EditRentalPage key={orderId} orderId={orderId} />;
}
