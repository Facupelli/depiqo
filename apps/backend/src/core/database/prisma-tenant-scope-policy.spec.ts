import { Prisma } from '../../generated/prisma/client';
import { DIRECT_TENANT_WHERE_EXCLUDED_MODELS } from './prisma.service';

describe('Prisma tenant-scope model policy', () => {
  const generatedModels = Object.values(Prisma.ModelName);

  it('requires every generically scoped model to expose a direct tenantId field', () => {
    const modelsWithoutDirectTenantId = generatedModels.filter((model) => {
      if (DIRECT_TENANT_WHERE_EXCLUDED_MODELS.has(model)) {
        return false;
      }

      const scalarFields = Reflect.get(Prisma, `${model}ScalarFieldEnum`);

      return (
        typeof scalarFields !== 'object' || scalarFields === null || !Object.values(scalarFields).includes('tenantId')
      );
    });

    expect(modelsWithoutDirectTenantId).toEqual([]);
  });

  it('contains only generated Prisma model names in the exclusion set', () => {
    const generatedModelNames = new Set<string>(generatedModels);
    const staleExclusions = [...DIRECT_TENANT_WHERE_EXCLUDED_MODELS].filter((model) => !generatedModelNames.has(model));

    expect(staleExclusions).toEqual([]);
  });
});
