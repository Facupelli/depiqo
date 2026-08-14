/**
 * Slugs that can never be registered as tenant identifiers.
 *
 * This list is the single source of truth for tenant-management.
 */
export const BANNED_TENANT_SLUGS: readonly string[] = [
  'app',
  'www',
  'api',
  'admin',
  'auth',
  'internal',
  'mail',
  'static',
  'equipment',
  'branding',
] as const;
