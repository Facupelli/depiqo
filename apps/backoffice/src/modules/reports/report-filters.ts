import {
	type ReportQueryDto,
	ReportRentalStatusSchema,
} from "@repo/api-contracts";

/** Default to the tenant-local current year; an omitted month means the full year. */
export function resolveReportPeriod(
	search: { year?: number; month?: number },
	timezone: string,
	now = new Date(),
): { year: number; month?: number } {
	if (search.year !== undefined) {
		return { year: search.year, month: search.month };
	}

	const parts = new Intl.DateTimeFormat("en", {
		timeZone: timezone,
		year: "numeric",
	}).formatToParts(now);
	const currentYear = Number(parts.find((part) => part.type === "year")?.value);
	return {
		year: currentYear,
		...(search.month !== undefined ? { month: search.month } : {}),
	};
}

/** Rental reports open on the current month; an explicit year still allows the full year. */
export function resolveRentalReportPeriod(
	search: { year?: number; month?: number },
	timezone: string,
	now = new Date(),
): { year: number; month?: number } {
	const period = resolveReportPeriod(search, timezone, now);
	if (search.year !== undefined || search.month !== undefined) return period;
	const month = Number(
		new Intl.DateTimeFormat("en", {
			timeZone: timezone,
			month: "numeric",
		}).format(now),
	);
	return { ...period, month };
}

export function normalizeReportQuery<T extends ReportQueryDto>(query: T): T {
	return {
		...query,
		statuses: ReportRentalStatusSchema.options.filter((status) =>
			query.statuses.includes(status),
		),
	};
}

export function getReportSearchParams(query: ReportQueryDto): URLSearchParams {
	const params = new URLSearchParams({
		year: String(query.year),
		statuses: query.statuses.join(","),
		page: String(query.page),
		pageSize: String(query.pageSize),
	});
	if (query.month !== undefined) params.set("month", String(query.month));
	if (query.branchId !== undefined) params.set("branchId", query.branchId);
	return params;
}
