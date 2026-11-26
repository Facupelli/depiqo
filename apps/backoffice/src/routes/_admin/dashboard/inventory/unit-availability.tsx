import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { inventoryReadPermissions } from "@/auth/capabilities";
import { can, canAny, requireRouteAccess } from "@/auth/permissions";
import { isTimelineDate } from "@/modules/inventory/unit-availability/unit-availability.utils";
import { UnitAvailabilityPage } from "@/modules/inventory/unit-availability/unit-availability-page";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const searchSchema = z.object({
	branchId: z.string().trim().min(1).optional().catch(undefined),
	date: z.iso.date().refine(isTimelineDate).optional().catch(undefined),
});

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/unit-availability",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, inventoryReadPermissions),
		);
	},
	validateSearch: searchSchema,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar la disponibilidad de unidades."
			forbiddenMessage="No tienes permisos para ver la disponibilidad de unidades."
		/>
	),
	component: UnitAvailabilityRoute,
});

function UnitAvailabilityRoute() {
	const search = Route.useSearch();
	const { user } = Route.useRouteContext();
	const navigate = Route.useNavigate();

	return (
		<UnitAvailabilityPage
			branchId={search.branchId}
			canReadRentals={can(user.permissions, TenantPermission.RentalsRead)}
			date={search.date}
			onBranchChange={(branchId) =>
				navigate({ search: (previous) => ({ ...previous, branchId }) })
			}
			onDateChange={(date) =>
				navigate({ search: (previous) => ({ ...previous, date }) })
			}
		/>
	);
}
