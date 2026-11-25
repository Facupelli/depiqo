import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';

export function parsePostgresRange(rangeStr: string) {
  const inner = rangeStr.replace(/^[\[(]/, '').replace(/[\])]$/, '');

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
  return `[${range.start.toISOString()}, ${range.end.toISOString()})`;
}
