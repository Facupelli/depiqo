import {
	getEquipmentReservationsReportContract,
	TenantPermission,
} from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { can, requireRouteAccess } from "@/auth/permissions";
import { equipmentReservationsReportQueries } from "@/modules/reports/equipment-reservations-report/equipment-reservations-report.queries";
import { EquipmentReservationsReportPage } from "@/modules/reports/equipment-reservations-report/equipment-reservations-report-page";
import { resolveReportPeriod } from "@/modules/reports/report-filters";
import { getReportContext } from "@/modules/reports/reports.queries";

const equipmentReservationsReportSearchSchema =
	getEquipmentReservationsReportContract.query.extend({
		year: getEquipmentReservationsReportContract.query.shape.year.optional(),
	});

export const Route = createFileRoute("/_admin/dashboard/reports/equipment")({
	validateSearch: equipmentReservationsReportSearchSchema,
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.ReportsEquipmentRead),
		);
	},
	// Every validated search field affects the report request.
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps }) => {
		const business = await queryClient.ensureQueryData(
			currentBusinessQueries.current(),
		);
		await queryClient.fetchQuery(
			equipmentReservationsReportQueries.report(
				{
					...deps,
					...resolveReportPeriod(deps, business.config.timezone),
				},
				getReportContext(business),
			),
		);
	},
	component: EquipmentReservationsReportRoute,
});

function EquipmentReservationsReportRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	return (
		<EquipmentReservationsReportPage
			input={{
				...search,
				...resolveReportPeriod(search, business.config.timezone),
			}}
			context={getReportContext(business)}
			onInputChange={(input) => {
				void navigate({ to: ".", search: input, resetScroll: false });
			}}
		/>
	);
}
