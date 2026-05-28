import dayjs from "@/lib/dates/dayjs";

export function formatRentalDetailDateTime(value: string) {
	return dayjs(value).format("DD MMM, YYYY · HH:mm A");
}

export function formatRentalDetailDateBlock(value: string, timezone: string) {
	const date = dayjs(value).tz(timezone);

	return {
		date: date.format("MMM DD, YYYY"),
		time: date.format("HH:mm"),
	};
}

export function getRentalCustomerInitials(value: string) {
	return (
		value
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "?"
	);
}

export function isNonEmptyString(
	value: string | null | undefined,
): value is string {
	return typeof value === "string" && value.length > 0;
}
