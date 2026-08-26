import { ValidityWindowChecker } from './validity-window-checker';

describe('ValidityWindowChecker', () => {
  const checker = new ValidityWindowChecker();

  it('uses inclusive local-date bounds, including a same-day window', () => {
    expect(
      checker.isWithinWindow({
        localDate: '2026-08-10',
        validFrom: '2026-08-10',
        validUntil: '2026-08-10',
      }),
    ).toBe(true);
  });

  it.each([
    ['before the first valid date', '2026-08-09', false],
    ['on the first valid date', '2026-08-10', true],
    ['on the last valid date', '2026-08-12', true],
    ['after the last valid date', '2026-08-13', false],
  ])('%s', (_description, localDate, expected) => {
    expect(
      checker.isWithinWindow({
        localDate,
        validFrom: '2026-08-10',
        validUntil: '2026-08-12',
      }),
    ).toBe(expected);
  });

  it('supports open-ended local-date windows', () => {
    expect(checker.isWithinWindow({ localDate: '2026-08-10', validUntil: '2026-08-10' })).toBe(true);
    expect(checker.isWithinWindow({ localDate: '2026-08-11', validUntil: '2026-08-10' })).toBe(false);
    expect(checker.isWithinWindow({ localDate: '2026-08-10', validFrom: '2026-08-10' })).toBe(true);
    expect(checker.isWithinWindow({ localDate: '2026-08-09', validFrom: '2026-08-10' })).toBe(false);
  });

  it.each(['2026-03-08', '2026-11-01'])(
    'uses local calendar keys unchanged on New York DST transition dates: %s',
    (localDate) => {
      expect(checker.isWithinWindow({ localDate, validFrom: localDate, validUntil: localDate })).toBe(true);
    },
  );
});
