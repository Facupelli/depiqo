import { GetStorefrontBranchScheduleSlotsHandler } from './get-storefront-branch-schedule-slots.handler';
import { GetStorefrontBranchScheduleSlotsQuery } from './get-storefront-branch-schedule-slots.query';

describe('GetStorefrontBranchScheduleSlotsHandler DST-date schedule lookup', () => {
  it.each([
    ['spring-forward', '2026-03-08'],
    ['fall-back', '2026-11-01'],
  ])(
    'preserves the local date, Sunday weekday, and specific-date override on the %s transition',
    async (_name, date) => {
      const findMany = jest.fn().mockResolvedValue([
        // A date override wins over the normal Sunday schedule without interpreting it as an instant.
        { specificDate: new Date(`${date}T00:00:00.000Z`), openTime: 540, closeTime: 600, slotIntervalMinutes: 30 },
        { specificDate: null, openTime: 480, closeTime: 720, slotIntervalMinutes: 60 },
      ]);
      const handler = new GetStorefrontBranchScheduleSlotsHandler({
        client: { v2BranchSchedule: { findMany } },
      } as never);

      await expect(
        handler.execute(new GetStorefrontBranchScheduleSlotsQuery('tenant-1', 'branch-1', date)),
      ).resolves.toEqual({
        pickupSlots: [540, 570],
      });
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.arrayContaining([{ dayOfWeek: 0 }]) }),
        }),
      );
    },
  );
});
