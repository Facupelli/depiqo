import type { Dayjs } from "dayjs";
import dayjs from "./dayjs";

/**
 * "March 15, 2025"
 */
export function formatDate(date: Dayjs | null): string {
	if (!date) return "—";
	return date.utc().format("MMMM D, YYYY");
}

/**
 * Formats an absolute timestamp in the supplied IANA timezone.
 *
 * Timezone selection belongs to shared/timezone; this utility only converts and
 * formats the value it receives.
 */
export function formatTimestampInTimezone(
	value: string | Date | Dayjs,
	timezone: string,
	format: string,
): string {
	return dayjs.utc(value).tz(timezone).format(format);
}
