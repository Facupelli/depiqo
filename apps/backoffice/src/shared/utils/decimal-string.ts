export type ParsedDecimal = {
	units: bigint;
	scale: number;
};

/**
 * Parses plain decimals with `.` or `,` as the decimal separator, without
 * thousands separators or currency symbols. Returns null for invalid input.
 */
export function parsePlainDecimal(value: string): ParsedDecimal | null {
	const match = /^([+-]?)(\d+)(?:[.,](\d+))?$/.exec(value.trim());
	if (!match) return null;

	const [, sign, integer = "", fraction = ""] = match;
	return {
		units: BigInt(`${integer}${fraction}`) * (sign === "-" ? -1n : 1n),
		scale: fraction.length,
	};
}

function decimalUnitsAtScale(value: ParsedDecimal, scale: number): bigint {
	return value.units * 10n ** BigInt(scale - value.scale);
}

/** Serializes at the supplied scale, preserving trailing fractional zeros. */
export function normalizeDecimal(value: ParsedDecimal): string {
	const negative = value.units < 0n;
	const digits = (negative ? -value.units : value.units)
		.toString()
		.padStart(value.scale + 1, "0");
	const integer =
		digits.slice(0, digits.length - value.scale).replace(/^0+(?=\d)/, "") ||
		"0";
	const fraction = value.scale > 0 ? digits.slice(-value.scale) : "";
	return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

export function decimalsEqual(
	left: ParsedDecimal,
	right: ParsedDecimal,
): boolean {
	const scale = Math.max(left.scale, right.scale);
	return decimalUnitsAtScale(left, scale) === decimalUnitsAtScale(right, scale);
}

export function subtractDecimals(
	left: ParsedDecimal,
	right: ParsedDecimal,
): string {
	const scale = Math.max(left.scale, right.scale);
	let units =
		decimalUnitsAtScale(left, scale) - decimalUnitsAtScale(right, scale);
	let normalizedScale = scale;
	while (normalizedScale > 0 && units % 10n === 0n) {
		units /= 10n;
		normalizedScale -= 1;
	}
	return normalizeDecimal({ units, scale: normalizedScale });
}

export function sumDecimalStrings(values: readonly string[]): string {
	const decimals = values.map((value) => {
		const parsed = parsePlainDecimal(value);
		if (!parsed) throw new Error("Invalid decimal amount.");
		return parsed;
	});
	const scale = Math.max(0, ...decimals.map((value) => value.scale));
	const units = decimals.reduce(
		(total, value) => total + decimalUnitsAtScale(value, scale),
		0n,
	);
	return normalizeDecimal({ units, scale });
}

/** Returns true only for valid decimal representations of zero; invalid input returns false. */
export function isZeroDecimal(value: string): boolean {
	const parsed = parsePlainDecimal(value);
	return parsed !== null && parsed.units === 0n;
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

const integerFormatter = new Intl.NumberFormat("es-AR", {
	maximumFractionDigits: 0,
});

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
	let formatter = currencyFormatters.get(currency);
	if (!formatter) {
		formatter = new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency,
			currencyDisplay: "narrowSymbol",
		});
		currencyFormatters.set(currency, formatter);
	}
	return formatter;
}

/**
 * Round only at display time, without converting monetary amounts to Number.
 * Keep BigInt formatting for targets without exact Intl decimal-string support.
 */
export function formatExactMoney(amount: string, currency: string): string {
	const parsed = parsePlainDecimal(amount);
	if (!parsed) throw new Error("Invalid monetary amount.");
	const formatter = getCurrencyFormatter(currency);
	const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
	const absolute = parsed.units < 0n ? -parsed.units : parsed.units;
	let rounded: bigint;
	if (parsed.scale > digits) {
		const divisor = 10n ** BigInt(parsed.scale - digits);
		rounded = (absolute + divisor / 2n) / divisor;
	} else {
		rounded = absolute * 10n ** BigInt(digits - parsed.scale);
	}
	const factor = 10n ** BigInt(digits);
	const whole = rounded / factor;
	const fraction = (rounded % factor).toString().padStart(digits, "0");
	// Formatting -1 preserves the locale's negative pattern, even for -0.xx.
	const template = parsed.units < 0n && rounded > 0n ? -1n : 0n;
	const grouped = integerFormatter
		.formatToParts(whole)
		.map((part) => part.value)
		.join("");
	let replacedInteger = false;
	return formatter
		.formatToParts(template)
		.map((part) => {
			if (part.type === "integer") {
				if (replacedInteger) return "";
				replacedInteger = true;
				return grouped;
			}
			if (part.type === "fraction") return fraction;
			return part.value;
		})
		.join("");
}
