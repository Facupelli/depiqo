import { dateInterval, oneMillisecondAfter, oneMillisecondBefore, utcDate } from './time';

describe('test time utilities', () => {
  it('creates explicit UTC timestamps', () => {
    expect(utcDate(2026, 6, 15, 10)).toEqual(new Date('2026-06-15T10:00:00.000Z'));
  });

  it('rejects invalid calendar components instead of normalizing them', () => {
    expect(() => utcDate(2026, 13, 1)).toThrow('month must be an integer between 1 and 12.');
    expect(() => utcDate(2026, 2, 29)).toThrow('day must be an integer between 1 and 28.');
    expect(() => utcDate(2024, 2, 30)).toThrow('day must be an integer between 1 and 29.');
  });

  it('creates exact millisecond boundary variations without mutating the source timestamp', () => {
    const boundary = utcDate(2026, 6, 15, 12);

    expect(oneMillisecondBefore(boundary).toISOString()).toBe('2026-06-15T11:59:59.999Z');
    expect(oneMillisecondAfter(boundary).toISOString()).toBe('2026-06-15T12:00:00.001Z');
    expect(boundary.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('groups dates without applying interval rules', () => {
    const start = utcDate(2026, 6, 15, 12);
    const end = utcDate(2026, 6, 15, 10);

    expect(dateInterval(start, end)).toEqual({ start, end });
  });
});
