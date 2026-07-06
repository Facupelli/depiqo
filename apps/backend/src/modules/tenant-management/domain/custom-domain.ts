import { err, ok, Result } from 'neverthrow';

import {
  InvalidCustomDomainError,
  UnsupportedApexCustomDomainError,
} from './errors/tenant-management.errors';

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:(?!-)[a-z0-9-]{2,63}(?<!-))$/;

type NormalizeCustomDomainError = InvalidCustomDomainError | UnsupportedApexCustomDomainError;

export function normalizeAndValidateCustomDomain(
  rawDomain: string,
  rootDomain: string,
): Result<string, NormalizeCustomDomainError> {
  const normalizedDomain = rawDomain.trim().toLowerCase().replace(/\.+$/, '');
  const normalizedRootDomain = rootDomain.trim().toLowerCase().replace(/\.+$/, '');

  if (
    normalizedDomain.length === 0 ||
    normalizedDomain.includes('://') ||
    normalizedDomain.includes('/') ||
    normalizedDomain.includes('?') ||
    normalizedDomain.includes('#') ||
    normalizedDomain.includes(':')
  ) {
    return err(new InvalidCustomDomainError(rawDomain));
  }

  if (
    normalizedDomain === `app.${normalizedRootDomain}` ||
    normalizedDomain === `customers.${normalizedRootDomain}` ||
    normalizedDomain === normalizedRootDomain ||
    normalizedDomain.endsWith(`.${normalizedRootDomain}`)
  ) {
    return err(new InvalidCustomDomainError(normalizedDomain));
  }

  if (!HOSTNAME_PATTERN.test(normalizedDomain)) {
    return err(new InvalidCustomDomainError(rawDomain));
  }

  if (normalizedDomain.split('.').length < 3) {
    return err(new UnsupportedApexCustomDomainError(normalizedDomain));
  }

  return ok(normalizedDomain);
}
