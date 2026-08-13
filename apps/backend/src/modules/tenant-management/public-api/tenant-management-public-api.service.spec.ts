import { TenantConfig } from '../domain/value-objects/tenant-config.value-object';
import { BranchFactsService } from './branch-facts.service';

describe('BranchFactsService timezone resolution', () => {
  const tenantConfig = TenantConfig.default().toPlainObject();

  function createService(
    branches: Array<{ id: string; timezone: string | null; supportsDelivery?: boolean }>,
    config = tenantConfig,
  ) {
    const findMany = jest.fn().mockResolvedValue(
      branches.map((branch) => ({
        id: branch.id,
        supportsDelivery: branch.supportsDelivery ?? false,
        timezone: branch.timezone,
        tenant: { config },
      })),
    );

    return {
      service: new BranchFactsService({ client: { v2Branch: { findMany } } } as never),
      findMany,
    };
  }

  it('uses the branch timezone when present', async () => {
    const { service } = createService([{ id: 'branch-a', timezone: 'America/New_York' }]);

    const result = await service.getBranchFacts({ tenantId: 'tenant-1', branchId: 'branch-a' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().effectiveTimezone).toBe('America/New_York');
    expect(result._unsafeUnwrap().timezoneSource).toBe('BRANCH');
  });

  it('uses the tenant timezone when the branch timezone is absent', async () => {
    const config = { ...tenantConfig, timezone: 'Europe/Madrid' };
    const { service } = createService([{ id: 'branch-a', timezone: null }], config);

    const result = await service.getBranchFacts({ tenantId: 'tenant-1', branchId: 'branch-a' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().effectiveTimezone).toBe('Europe/Madrid');
    expect(result._unsafeUnwrap().timezoneSource).toBe('TENANT');
  });

  it('uses UTC when neither timezone is configured', async () => {
    const config = { ...tenantConfig, timezone: '' };
    const { service } = createService([{ id: 'branch-a', timezone: null }], config);

    const result = await service.getBranchFacts({ tenantId: 'tenant-1', branchId: 'branch-a' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().effectiveTimezone).toBe('UTC');
  });

  it('resolves different branch timezones within the same tenant', async () => {
    const { service, findMany } = createService([
      { id: 'branch-a', timezone: 'America/Argentina/Buenos_Aires' },
      { id: 'branch-b', timezone: 'Asia/Tokyo' },
    ]);

    const result = await service.getBranchFactsBatch({
      tenantId: 'tenant-1',
      branchIds: ['branch-a', 'branch-b'],
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().map((context) => context.effectiveTimezone)).toEqual([
      'America/Argentina/Buenos_Aires',
      'Asia/Tokyo',
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid resolved timezone', async () => {
    const config = { ...tenantConfig, timezone: 'Not/A_Timezone' };
    const { service } = createService([{ id: 'branch-a', timezone: null }], config);

    const result = await service.getBranchFacts({ tenantId: 'tenant-1', branchId: 'branch-a' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('TenantConfigurationInvalid');
  });
});
