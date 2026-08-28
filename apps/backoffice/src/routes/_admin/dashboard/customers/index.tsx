import { RentalCustomerOnboardingStatusSchema } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CustomersListPage } from "@/modules/customers/list-customers/CustomersListPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const customersSearchSchema = z.object({
	status: RentalCustomerOnboardingStatusSchema.optional(),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const Route = createFileRoute("/_admin/dashboard/customers/")({
	validateSearch: customersSearchSchema,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar los clientes."
			forbiddenMessage="No tienes permisos para ver los clientes."
		/>
	),
	component: CustomersRoute,
});

function CustomersRoute() {
	return <CustomersListPage search={Route.useSearch()} />;
}
