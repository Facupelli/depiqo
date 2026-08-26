import type { GetOwnersItemDto } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OwnersPage } from "@/modules/inventory/ownership/list-owners/OwnersPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/owners/")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar los propietarios."
				forbiddenMessage="No tienes permisos para ver los propietarios."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();

	function handleOwnerSelect(owner: GetOwnersItemDto) {
		navigate({
			to: "/dashboard/owners/$ownerId",
			params: { ownerId: owner.id },
		});
	}

	return <OwnersPage onOwnerSelect={handleOwnerSelect} />;
}
