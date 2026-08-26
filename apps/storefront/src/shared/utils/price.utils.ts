export const formatCurrency = (
	amount: number,
	currency: string,
	locale: string,
	fractionDigits = 0,
): string => {
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits,
		}).format(amount);
	} catch {
		// Graceful degradation: show raw number + currency code
		return `${currency} ${amount.toFixed(2)}`;
	}
};
