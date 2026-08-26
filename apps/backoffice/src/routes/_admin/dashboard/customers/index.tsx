import { createFileRoute } from "@tanstack/react-router";
import { CustomersListPage } from "@/modules/customers/list-customers/CustomersListPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/customers/")({
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar los clientes."
			forbiddenMessage="No tienes permisos para ver los clientes."
		/>
	),
	component: CustomersListPage,
});
