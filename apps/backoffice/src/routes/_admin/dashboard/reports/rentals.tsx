import {
	getRentalOrdersReportContract,
	TenantPermission,
} from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { rentalWorkspacePermissions } from "@/auth/capabilities";
import { can, canAny, requireRouteAccess } from "@/auth/permissions";
import { rentalOrdersReportQueries } from "@/modules/reports/rental-orders-report/rental-orders-report.queries";
import { RentalOrdersReportPage } from "@/modules/reports/rental-orders-report/rental-orders-report-page";
import { resolveRentalReportPeriod } from "@/modules/reports/report-filters";
import { getReportContext } from "@/modules/reports/reports.queries";

const rentalOrdersReportSearchSchema =
	getRentalOrdersReportContract.query.extend({
		year: getRentalOrdersReportContract.query.shape.year.optional(),
	});

export const Route = createFileRoute("/_admin/dashboard/reports/rentals")({
	validateSearch: rentalOrdersReportSearchSchema,
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.ReportsRentalsRead),
		);
	},
	// Every validated search field affects the report request.
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps }) => {
		const business = await queryClient.ensureQueryData(
			currentBusinessQueries.current(),
		);
		await queryClient.fetchQuery(
			rentalOrdersReportQueries.report(
				{
					...deps,
					...resolveRentalReportPeriod(deps, business.config.timezone),
				},
				getReportContext(business),
			),
		);
	},
	component: RentalOrdersReportRoute,
});

function RentalOrdersReportRoute() {
	const search = Route.useSearch();
	const { user } = Route.useRouteContext();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	return (
		<RentalOrdersReportPage
			input={{
				...search,
				...resolveRentalReportPeriod(search, business.config.timezone),
			}}
			context={getReportContext(business)}
			canOpenRental={canAny(user.permissions, rentalWorkspacePermissions)}
			onInputChange={(input) => {
				void navigate({ to: ".", search: input, resetScroll: false });
			}}
		/>
	);
}
