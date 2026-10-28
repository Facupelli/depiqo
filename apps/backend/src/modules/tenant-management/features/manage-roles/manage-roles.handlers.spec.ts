import { GetTenantPermissionCatalogResponseSchema, TenantPermission } from '@repo/api-contracts';
import { describe, expect, it } from 'vitest';

import { GetTenantPermissionCatalogHandler } from './manage-roles.handlers';

// Role-management controls render this catalog directly, including its groups.
describe('GetTenantPermissionCatalogHandler', () => {
  it('publishes the grantable financial-report permission with its limited scope', async () => {
    const catalog = await new GetTenantPermissionCatalogHandler().execute();

    expect(GetTenantPermissionCatalogResponseSchema.safeParse(catalog).success).toBe(true);
    expect(catalog.filter(({ id }) => id === TenantPermission.FinancesRead)).toEqual([
      {
        id: TenantPermission.FinancesRead,
        group: 'Finanzas',
        label: 'Ver finanzas',
        description:
          'Permite consultar reportes agregados de alquileres e importes contractuales de terceros. No modifica el acceso a los importes del detalle de cada alquiler.',
      },
    ]);
  });
});
