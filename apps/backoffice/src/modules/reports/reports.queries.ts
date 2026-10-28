import type { GetCurrentTenantResponseDto } from "@repo/api-contracts";
import { getProblemDetailsStatus } from "@/shared/errors";

export type ReportContext = {
	tenantId: string;
	timezone: string;
};

export function getReportContext(
	business: GetCurrentTenantResponseDto,
): ReportContext {
	return { tenantId: business.id, timezone: business.config.timezone };
}

export const reportKeys = {
	// Share the rental resource namespace so rental mutations refresh reports.
	all: () => ["v2", "rental-commitment", "rentals", "reports"] as const,
	rentals: () => [...reportKeys.all(), "rentals"] as const,
	equipment: () => [...reportKeys.all(), "equipment"] as const,
};

export function retryReportQuery(failureCount: number, error: Error): boolean {
	const status = getProblemDetailsStatus(error);
	return (
		failureCount < 2 &&
		(status === 0 || (status !== undefined && status >= 500))
	);
}
