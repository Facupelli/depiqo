import { randomUUID } from 'node:crypto';

import { createDirectDatabaseTestContext, DirectDatabaseTestContext } from '../../support/direct-database-test-context';
import { useIntegrationTestContext } from '../../support/integration-test-context';

describe('Prisma database integration', () => {
  let database: DirectDatabaseTestContext;

  useIntegrationTestContext(async () => {
    database = await createDirectDatabaseTestContext();
    return database;
  });

  it('persists and reads data through Prisma against real PostgreSQL', async () => {
    const created = await database.prisma.billingUnit.create({
      data: { label: `Day ${randomUUID()}`, durationMinutes: 1440, sortOrder: 1 },
    });

    await expect(database.prisma.billingUnit.findUnique({ where: { id: created.id } })).resolves.toMatchObject({
      label: created.label,
      durationMinutes: 1440,
    });
  });

  it('enforces database uniqueness without requiring an empty database', async () => {
    const label = `Unique billing unit ${randomUUID()}`;
    await database.prisma.billingUnit.create({ data: { label, durationMinutes: 60, sortOrder: 2 } });

    await expect(
      database.prisma.billingUnit.create({ data: { label, durationMinutes: 30, sortOrder: 3 } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
