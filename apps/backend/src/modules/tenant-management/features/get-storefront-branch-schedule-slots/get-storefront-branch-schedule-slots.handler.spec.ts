import { GetStorefrontBranchScheduleSlotsHandler } from './get-storefront-branch-schedule-slots.handler';
import { GetStorefrontBranchScheduleSlotsQuery } from './get-storefront-branch-schedule-slots.query';

describe('GetStorefrontBranchScheduleSlotsHandler DST-date schedule lookup', () => {
  it.each([
    ['spring-forward', '2026-03-08', '13'],
    ['fall-back', '2026-11-01', '14'],
  ])(
    'preserves the local date, Sunday weekday, and specific-date override on the %s transition',
    async (_name, date, utcHour) => {
      const findMany = jest.fn().mockResolvedValue([
        // A date override wins over the normal Sunday schedule without interpreting it as an instant.
        { specificDate: new Date(`${date}T00:00:00.000Z`), openTime: 540, closeTime: 600, slotIntervalMinutes: 30 },
        { specificDate: null, openTime: 480, closeTime: 720, slotIntervalMinutes: 60 },
      ]);
      const handler = new GetStorefrontBranchScheduleSlotsHandler({
        client: {
          v2Branch: {
            findFirst: jest.fn().mockResolvedValue({
              timezone: 'America/New_York',
              tenant: {
                config: {
                  timezone: 'UTC',
                  pricing: {},
                  notifications: {},
                  communication: { orderCommunicationMode: 'FORMAL' },
                  bookingMode: 'instant-book',
                },
              },
            }),
          },
          v2BranchSchedule: { findMany },
        },
      } as never);

      await expect(
        handler.execute(new GetStorefrontBranchScheduleSlotsQuery('tenant-1', 'branch-1', date)),
      ).resolves.toEqual({
        pickupSlots: [
          { minuteOfDay: 540, instant: `${date}T${utcHour}:00:00.000Z` },
          { minuteOfDay: 570, instant: `${date}T${utcHour}:30:00.000Z` },
        ],
      });
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.arrayContaining([{ dayOfWeek: 0 }]) }),
        }),
      );
    },
  );
});
