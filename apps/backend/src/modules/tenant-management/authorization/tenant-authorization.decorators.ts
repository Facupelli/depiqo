import type { TenantPermission } from '@repo/api-contracts';

import {
  TENANT_AUTHORIZATION_REQUIREMENT_KEY,
  type TenantAuthorizationRequirement,
} from './tenant-authorization-requirement';

type AuthorizationDeclarationDecorator = ClassDecorator & MethodDecorator;
type AuthorizationDecoratorTarget = Parameters<ClassDecorator>[0] | Parameters<MethodDecorator>[0];

export function RequirePermission(permission: TenantPermission): AuthorizationDeclarationDecorator {
  return authorizationRequirement({ type: 'ONE', permission });
}

export function RequireAnyPermission(
  permission: TenantPermission,
  ...additionalPermissions: TenantPermission[]
): AuthorizationDeclarationDecorator {
  if (permission === undefined) {
    throw new TypeError('RequireAnyPermission requires at least one tenant permission.');
  }

  return authorizationRequirement({
    type: 'ANY',
    permissions: Object.freeze([permission, ...additionalPermissions]),
  });
}

export function RequireAllPermissions(
  permission: TenantPermission,
  ...additionalPermissions: TenantPermission[]
): AuthorizationDeclarationDecorator {
  if (permission === undefined) {
    throw new TypeError('RequireAllPermissions requires at least one tenant permission.');
  }

  return authorizationRequirement({
    type: 'ALL',
    permissions: Object.freeze([permission, ...additionalPermissions]),
  });
}

export function AuthorizationExempt(): AuthorizationDeclarationDecorator {
  return authorizationRequirement({ type: 'EXEMPT' });
}

export function ConditionalAuthorization(): AuthorizationDeclarationDecorator {
  return authorizationRequirement({ type: 'CONDITIONAL' });
}

function authorizationRequirement(requirement: TenantAuthorizationRequirement): AuthorizationDeclarationDecorator {
  return (
    target: AuthorizationDecoratorTarget,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): void => {
    const metadataTarget = descriptor?.value ?? target;

    if (Reflect.hasOwnMetadata(TENANT_AUTHORIZATION_REQUIREMENT_KEY, metadataTarget)) {
      throw new TypeError('Only one tenant authorization declaration may be applied to the same target.');
    }

    Reflect.defineMetadata(TENANT_AUTHORIZATION_REQUIREMENT_KEY, Object.freeze(requirement), metadataTarget);
  };
}
