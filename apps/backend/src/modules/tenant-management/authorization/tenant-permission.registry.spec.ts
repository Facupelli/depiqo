import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TenantPermission } from '@repo/api-contracts';

import {
  ALL_TENANT_PERMISSIONS,
  DEFAULT_MEMBER_TENANT_PERMISSIONS,
  TENANT_PERMISSION_REGISTRY,
  TenantPermissionGroup,
  assertTenantPermission,
  getTenantPermissionMetadata,
  isTenantPermission,
  parseTenantPermission,
} from './tenant-permission.registry';

const EXPECTED_PERMISSION_IDS = [
  'rentals.read',
  'rentals.proposals.manage',
  'rentals.confirm',
  'rentals.confirmed.manage',
  'rentals.fulfillment.manage',
  'rentals.cancel',
  'rentals.price_adjustment.manage',
  'contracts.read',
  'contracts.generate',
  'contracts.signing.send',
  'products.read',
  'products.manage',
  'products.availability.manage',
  'inventory.read',
  'inventory.manage',
  'inventory.ownership.manage',
  'pricing.read',
  'pricing.manage',
  'customers.read',
  'customers.onboarding.manage',
  'branches.manage',
  'tenant.settings.manage',
  'tenant.storefront.manage',
  'tenant.contract_signer.manage',
  'team.read',
  'team.manage',
] as const;

describe('tenant permission registry', () => {
  it('contains exactly the 26 V1 permissions with unique identifiers', () => {
    const ids = TENANT_PERMISSION_REGISTRY.map(({ id }) => id);

    expect(ids).toHaveLength(26);
    expect(new Set(ids)).toHaveProperty('size', 26);
    expect(ids).toEqual(EXPECTED_PERMISSION_IDS);
  });

  it('provides complete metadata in a valid group for every permission', () => {
    const validGroups = new Set(Object.values(TenantPermissionGroup));

    for (const registeredPermission of TENANT_PERMISSION_REGISTRY) {
      expect(registeredPermission.label).not.toHaveLength(0);
      expect(registeredPermission.description).not.toHaveLength(0);
      expect(validGroups.has(registeredPermission.group)).toBe(true);
      expect(getTenantPermissionMetadata(registeredPermission.id)).toBe(registeredPermission);
    }
  });

  it('recognizes and parses every registered permission', () => {
    for (const { id } of TENANT_PERMISSION_REGISTRY) {
      expect(isTenantPermission(id)).toBe(true);
      expect(parseTenantPermission(id)).toBe(id);

      const persistedValue: string = id;
      assertTenantPermission(persistedValue);
      expect(persistedValue).toBe(id);
    }
  });

  it('rejects an unknown persisted permission identifier', () => {
    expect(isTenantPermission('rentals.unknown')).toBe(false);
    expect(() => parseTenantPermission('rentals.unknown')).toThrow('Unknown tenant permission: rentals.unknown');
    expect(() => assertTenantPermission('rentals.unknown')).toThrow(TypeError);
  });

  it('enumerates every registered permission for future Administrator semantics', () => {
    expect(ALL_TENANT_PERMISSIONS).toHaveLength(26);
    expect(ALL_TENANT_PERMISSIONS).toEqual(EXPECTED_PERMISSION_IDS);
  });

  it('defines the default Miembro baseline as every non-Team permission', () => {
    const expectedNonTeamPermissions = TENANT_PERMISSION_REGISTRY.filter(
      ({ group }) => group !== TenantPermissionGroup.Team,
    ).map(({ id }) => id);

    expect(DEFAULT_MEMBER_TENANT_PERMISSIONS).toEqual(expectedNonTeamPermissions);
    expect(DEFAULT_MEMBER_TENANT_PERMISSIONS).toHaveLength(24);
    expect(DEFAULT_MEMBER_TENANT_PERMISSIONS).not.toContain(TenantPermission.TeamRead);
    expect(DEFAULT_MEMBER_TENANT_PERMISSIONS).not.toContain(TenantPermission.TeamManage);
  });

  it('does not depend on generated Prisma or the legacy permission enum', () => {
    const source = readFileSync(join(__dirname, 'tenant-permission.registry.ts'), 'utf8');

    expect(source).not.toContain('@generated/prisma');
    expect(source).not.toMatch(/from ['"]@prisma\/client['"]/);
  });
});
