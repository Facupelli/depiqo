import {
	GetRentalFinancialReportQuerySchema,
	TenantPermission,
} from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { can, requireRouteAccess } from "@/auth/permissions";
import {
	getFinancialReportContext,
	rentalFinancialReportQueries,
} from "@/modules/finances/rental-financial-report/rental-financial-report.queries";
import {
	financialReportPeriods,
	getDefaultFinancialReportPeriod,
	getFinancialReportCalendar,
} from "@/modules/finances/rental-financial-report/rental-financial-report.utils";
import { RentalFinancialReportPage } from "@/modules/finances/rental-financial-report/rental-financial-report-page";
import {
	RentalFinancialReportError,
	RentalFinancialReportSkeleton,
} from "@/modules/finances/rental-financial-report/rental-financial-report-state";

const financialReportSearchSchema = z.object({
	year: GetRentalFinancialReportQuerySchema.shape.year.optional(),
	period: z.coerce.string().pipe(z.enum(financialReportPeriods)).optional(),
	includeInsurance: z.boolean().optional(),
	includeDelivery: z.boolean().optional(),
});

export const Route = createFileRoute("/_admin/dashboard/finances/")({
	validateSearch: financialReportSearchSchema,
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.FinancesRead),
		);
	},
	// Period and inclusion options only change presentation of the yearly report.
	loaderDeps: ({ search }) => ({ year: search.year }),
	loader: async ({ context: { queryClient }, deps }) => {
		const business = await queryClient.ensureQueryData(
			currentBusinessQueries.current(),
		);
		const year =
			deps.year ?? getFinancialReportCalendar(business.config.timezone).year;
		await queryClient.fetchQuery(
			rentalFinancialReportQueries.report(
				year,
				getFinancialReportContext(business),
			),
		);
	},
	pendingComponent: RentalFinancialReportSkeleton,
	pendingMs: 0,
	errorComponent: FinancialReportRouteError,
	component: FinancialReportRoute,
});

function FinancialReportRouteError({ error }: { error: unknown }) {
	const router = useRouter();
	return (
		<RentalFinancialReportError
			error={error}
			onRetry={() => {
				void router.invalidate();
			}}
		/>
	);
}

function FinancialReportRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const calendar = getFinancialReportCalendar(business.config.timezone);
	const year = search.year ?? calendar.year;
	return (
		<RentalFinancialReportPage
			business={business}
			selection={{
				year,
				period:
					search.period ?? getDefaultFinancialReportPeriod(year, calendar),
				includeInsurance: search.includeInsurance ?? true,
				includeDelivery: search.includeDelivery ?? true,
			}}
			onSelectionChange={(selection) => {
				void navigate({ to: ".", search: selection });
			}}
		/>
	);
}
