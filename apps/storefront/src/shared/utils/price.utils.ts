export function formatExactCurrencyRate(
	amount: string,
	currency: string,
	locale: string,
): string {
	// Never coerce an authored rate through a floating-point number or a
	// fixed-decimal currency formatter. Payable totals use formatCurrency.
	if (!/^\d+(?:\.\d+)?$/.test(amount)) return `${currency} ${amount}`;
	const [integer, fraction] = amount.split(".");
	try {
		const formatter = new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});
		const parts = formatter.formatToParts(0);
		const group =
			new Intl.NumberFormat(locale)
				.formatToParts(1000)
				.find((part) => part.type === "group")?.value ?? ",";
		const decimal =
			new Intl.NumberFormat(locale)
				.formatToParts(1.1)
				.find((part) => part.type === "decimal")?.value ?? ".";
		const digits =
			integer.replace(/\B(?=(\d{3})+(?!\d))/g, group) +
			(fraction ? decimal + fraction : "");
		return parts
			.map((part) => (part.type === "integer" ? digits : part.value))
			.join("");
	} catch {
		return `${currency} ${amount}`;
	}
}

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
