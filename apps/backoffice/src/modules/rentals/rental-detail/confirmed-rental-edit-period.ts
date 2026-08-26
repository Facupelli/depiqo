export interface ConfirmedRentalEditAvailabilityPeriod {
	periodStart: string;
	periodEnd: string;
}

export function deriveConfirmedRentalEditAvailabilityPeriod(
	currentEditTime: Date,
	rentalPeriod: { start: string; end: string },
): ConfirmedRentalEditAvailabilityPeriod {
	const rentalStart = new Date(rentalPeriod.start);
	const periodStart =
		currentEditTime.getTime() > rentalStart.getTime()
			? currentEditTime
			: rentalStart;

	return {
		periodStart: periodStart.toISOString(),
		periodEnd: rentalPeriod.end,
	};
}
