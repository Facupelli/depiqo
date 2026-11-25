export type DemoPeriod = { start: number; end: number; label: string };

// Serialize the reference month in the loader so SSR and hydration use the same dates.
export function getDemoMonth(now: Date): string {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
		.toISOString()
		.slice(0, 7);
}

export function getDemoCalendar(month: string) {
	const date = new Date(`${month}-01T12:00:00Z`);
	const shortMonth = new Intl.DateTimeFormat("es-AR", {
		month: "short",
		timeZone: "UTC",
	})
		.format(date)
		.replace(".", "");
	const monthLabel = new Intl.DateTimeFormat("es-AR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);

	return {
		monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
		year: date.getUTCFullYear(),
		periods: [
			{ start: 5, end: 8 },
			{ start: 7, end: 10 },
			{ start: 12, end: 14 },
		].map((period) => ({
			...period,
			label: `${period.start}–${period.end} ${shortMonth}`,
		})),
	};
}

export function demoPeriodsOverlap(a: DemoPeriod, b: DemoPeriod): boolean {
	return a.start <= b.end && b.start <= a.end;
}
