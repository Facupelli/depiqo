import type { GetCurrentTenantResponseDto } from "@repo/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { getProblemDetailsStatus } from "@/shared/errors";
import { getRentalFinancialReport } from "./get-rental-financial-report.api";

export type FinancialReportContext = {
	tenantId: string;
	timezone: string;
	currency: string;
};

export function getFinancialReportContext(
	business: GetCurrentTenantResponseDto,
): FinancialReportContext {
	return {
		tenantId: business.id,
		timezone: business.config.timezone,
		currency: business.config.pricing.currency,
	};
}

export const rentalFinancialReportKeys = {
	// Share the rental resource namespace, not Rentals frontend implementation.
	// Existing rental mutation invalidations also refresh these aggregates.
	all: () =>
		["v2", "rental-commitment", "rentals", "financial-report"] as const,
	report: (year: number, context: FinancialReportContext) =>
		[...rentalFinancialReportKeys.all(), { year, ...context }] as const,
};

export const rentalFinancialReportQueries = {
	report: (year: number, context: FinancialReportContext) =>
		queryOptions({
			queryKey: rentalFinancialReportKeys.report(year, context),
			queryFn: ({ signal }) => getRentalFinancialReport({ year }, signal),
			staleTime: 30_000,
			retry: (failureCount, error) => {
				const status = getProblemDetailsStatus(error);
				if (status && status >= 400 && status < 500) return false;
				return failureCount < 2;
			},
		}),
};
