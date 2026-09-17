import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';

/**
 * Parses a PostgreSQL tstzrange string into a { start, end } pair.
 *
 * Supported formats (both bounds styles are handled defensively):
 *   ["2025-06-01 00:00:00+00","2025-06-10 00:00:00+00")   ← standard [)
 *   ["2025-06-01T00:00:00.000Z","2025-06-10T00:00:00.000Z")  ← ISO variant
 *
 * Throws if the string cannot be parsed, surfacing data corruption early.
 */
export function parsePostgresRange(rangeStr: string) {
  // Strip the leading/trailing bound characters: [ ( ] )
  const inner = rangeStr.replace(/^[\[(]/, '').replace(/[\])]$/, '');

  // Split on the comma that separates the two timestamps.
  // We split on `","` to avoid splitting on commas inside the timestamps themselves.
  const parts = inner.split('","');

  if (parts.length !== 2) {
    throw new Error(`BlackoutPeriodMapper: Unable to parse tstzrange string: "${rangeStr}"`);
  }

  const startStr = parts[0].replace(/^"/, '');
  const endStr = parts[1].replace(/"$/, '');

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`BlackoutPeriodMapper: Parsed invalid dates from range string: "${rangeStr}"`);
  }

  return { start, end };
}

export function formatPostgresRange(range: DateRange): string {
  // Standard Postgres tstzrange format: '[start, end)'
  // Ensure dates are in ISO format or standard Postgres timestamp format
  return `[${range.start.toISOString()}, ${range.end.toISOString()})`;
}
