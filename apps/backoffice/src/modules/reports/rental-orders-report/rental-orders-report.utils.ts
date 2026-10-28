import { formatTimestampInTimezone } from "@/lib/dates/format";

export function formatReportRentalPeriod(
	start: string,
	end: string,
	timezone: string,
): string {
	const startDate = formatTimestampInTimezone(start, timezone, "YYYY-MM-DD");
	const endDate = formatTimestampInTimezone(end, timezone, "YYYY-MM-DD");
	if (startDate === endDate)
		return formatTimestampInTimezone(start, timezone, "D MMM YYYY");
	const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
	const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);
	return `${formatTimestampInTimezone(start, timezone, sameMonth ? "D" : sameYear ? "D MMM" : "D MMM YYYY")} - ${formatTimestampInTimezone(end, timezone, "D MMM YYYY")}`;
}

export function formatReportInvoiceDate(date: string): string {
	const [year, month, day] = date.split("-");
	return `${day}/${month}/${year}`;
}
