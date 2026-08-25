export type ParsedDecimal = {
	units: bigint;
	scale: number;
};

export function parsePlainDecimal(value: string): ParsedDecimal | null {
	const match = /^([+-]?)(\d+)(?:[.,](\d+))?$/.exec(value.trim());
	if (!match) return null;

	const [, sign, integer = "", fraction = ""] = match;
	const digits = `${integer}${fraction}`;
	const units = BigInt(digits) * (sign === "-" ? -1n : 1n);

	return {
		units,
		scale: fraction.length,
	};
}

function decimalUnitsAtScale(value: ParsedDecimal, scale: number): bigint {
	return value.units * 10n ** BigInt(scale - value.scale);
}

export function normalizeDecimal(value: ParsedDecimal): string {
	const negative = value.units < 0n;
	const absoluteDigits = (negative ? -value.units : value.units)
		.toString()
		.padStart(value.scale + 1, "0");

	const integer =
		absoluteDigits
			.slice(0, absoluteDigits.length - value.scale)
			.replace(/^0+(?=\d)/, "") || "0";

	const fraction = value.scale > 0 ? absoluteDigits.slice(-value.scale) : "";

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

	return normalizeDecimal({
		units,
		scale: normalizedScale,
	});
}

export function isZeroDecimal(value: string): boolean {
	const parsed = parsePlainDecimal(value);
	return parsed !== null && parsed.units === 0n;
}
