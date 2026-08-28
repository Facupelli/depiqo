import { createFileRoute } from "@tanstack/react-router";
import { OwnerDetailPage } from "@/modules/inventory/ownership/owner-detail/OwnerDetailPage";
import { ownerQueries } from "@/modules/inventory/ownership/owner-detail/owner-detail.queries";

export const Route = createFileRoute("/_admin/dashboard/owners/$ownerId")({
	loader: ({ context: { queryClient }, params: { ownerId } }) =>
		queryClient.ensureQueryData(ownerQueries.detail(ownerId)),
	component: RouteComponent,
});

function RouteComponent() {
	const { ownerId } = Route.useParams();

	return <OwnerDetailPage ownerId={ownerId} />;
}
