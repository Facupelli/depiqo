import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import * as ts from 'typescript';

type Classification =
  | 'STATIC_ONE'
  | 'STATIC_ANY'
  | 'STATIC_ALL'
  | 'CONDITIONAL'
  | 'EXEMPT'
  | 'PUBLIC'
  | 'TENANT_CUSTOMER'
  | 'INTERNAL'
  | 'MISSING'
  | 'CONFLICT';

type RouteAudit = {
  file: string;
  controller: string;
  method: string;
  httpMethod: string;
  path: string;
  actor: string;
  guards: string[];
  permissions: string;
  classification: Classification;
  issues: string[];
};

const repoRoot = resolve(__dirname, '../..');
const sourceRoot = resolve(repoRoot, 'src');
const controllerRouteDecorators = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options', 'All', 'Sse']);
const authorizationDecorators = new Set([
  'RequirePermission',
  'RequireAnyPermission',
  'RequireAllPermissions',
  'ConditionalAuthorization',
  'AuthorizationExempt',
]);
const expectedExemptRoutes = new Set([
  'ChangePasswordController.changePassword',
  'GetCurrentUserController.me',
  'LogoutController.logout',
  'UpdateWorkingBranchController.update',
  'GetCurrentTenantHttpController.me',
]);

function getControllerFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) return getControllerFiles(file);
    return entry.name.endsWith('.controller.ts') ? [file] : [];
  });
}

function getDecorators(node: ts.Node, sourceFile: ts.SourceFile) {
  return (ts.getDecorators(node) ?? []).map((decorator) => {
    const expression = decorator.expression;
    const name = expression.expression?.getText(sourceFile) ?? expression.getText(sourceFile);
    const args = expression.arguments?.map((argument) => argument.getText(sourceFile)) ?? [];
    return { name, args };
  });
}

function literalValue(value: string | undefined): string {
  return value?.replace(/^['"]|['"]$/g, '') ?? '';
}

function joinRoutePath(controllerPath: string, methodPath: string): string {
  return [controllerPath, methodPath].filter(Boolean).join('/');
}

function classifyRoute(input: {
  controllerPath: string;
  classDecorators: ReturnType<typeof getDecorators>;
  methodDecorators: ReturnType<typeof getDecorators>;
  guards: string[];
  authorization: ReturnType<typeof getDecorators>;
  controller: string;
  method: string;
  methodText: string;
}) {
  const { controllerPath, classDecorators, methodDecorators, guards, authorization } = input;
  const issues: string[] = [];
  const classAuthorization = classDecorators.filter(({ name }) => authorizationDecorators.has(name));
  const publicRoute = [...classDecorators, ...methodDecorators].some(({ name }) => name === 'Public');
  const internalRoute =
    controllerPath.startsWith('internal/') || guards.some((guard) => guard.includes('InternalTokenGuard'));
  const customerRoute =
    [...classDecorators, ...methodDecorators].some(
      ({ name, args }) => name === 'AllowAuthActors' && args.some((arg) => arg.includes('TENANT_CUSTOMER')),
    ) ||
    guards.some(
      (guard) => guard.includes('TenantCustomerSessionGuard') || guard.includes('StorefrontTenantCustomerSessionGuard'),
    );

  if (classAuthorization.length > 0 && authorization.length > 0) {
    issues.push('controller-level authorization is overridden at method level');
  }

  if (publicRoute && (classAuthorization.length > 0 || authorization.length > 0)) {
    issues.push('public metadata is combined with tenant authorization metadata');
  }

  if (internalRoute && (classAuthorization.length > 0 || authorization.length > 0)) {
    issues.push('internal route is combined with tenant authorization metadata');
  }

  if (authorization.length > 1) {
    issues.push('multiple authorization declarations apply to the method');
  }

  if (internalRoute) return { classification: 'INTERNAL', issues };
  if (publicRoute) return { classification: 'PUBLIC', issues };
  if (customerRoute) {
    if (authorization.length > 0 || classAuthorization.length > 0) {
      issues.push('tenant-customer route has tenant-user permission metadata');
    }
    return { classification: 'TENANT_CUSTOMER', issues };
  }

  const declaration = authorization[0] ?? classAuthorization[0];
  if (!declaration) return { classification: 'MISSING', issues };

  const classificationByDecorator = {
    RequirePermission: 'STATIC_ONE',
    RequireAnyPermission: 'STATIC_ANY',
    RequireAllPermissions: 'STATIC_ALL',
    ConditionalAuthorization: 'CONDITIONAL',
    AuthorizationExempt: 'EXEMPT',
  } satisfies Record<string, Classification>;
  const classification = classificationByDecorator[declaration.name];

  if (classification === 'EXEMPT' && !expectedExemptRoutes.has(`${input.controller}.${input.method}`)) {
    issues.push('exemption is not in the authenticated infrastructure allowlist');
  }

  if (classification === 'CONDITIONAL' && !/authorizationEnforcer\s*\.\s*require\w+/.test(input.methodText)) {
    issues.push('conditional route has no imperative authorization enforcer call');
  }

  return { classification, issues };
}

function auditControllers(): RouteAudit[] {
  const routes: RouteAudit[] = [];

  for (const file of getControllerFiles(sourceRoot).sort()) {
    const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isClassDeclaration(node) || !node.name) return;

      const classDecorators = getDecorators(node, sourceFile);
      const controllerDecorator = classDecorators.find(({ name }) => name === 'Controller');
      if (!controllerDecorator) return;

      const controllerPath = literalValue(controllerDecorator.args[0]);
      const classGuards = classDecorators.filter(({ name }) => name === 'UseGuards').flatMap(({ args }) => args);
      const classActors = classDecorators.filter(({ name }) => name === 'AllowAuthActors').flatMap(({ args }) => args);

      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member) || !member.name) continue;

        const methodDecorators = getDecorators(member, sourceFile);
        const routeDecorator = methodDecorators.find(({ name }) => controllerRouteDecorators.has(name));
        if (!routeDecorator) continue;

        const authorization = methodDecorators.filter(({ name }) => authorizationDecorators.has(name));
        const methodGuards = methodDecorators.filter(({ name }) => name === 'UseGuards').flatMap(({ args }) => args);
        const guards = [...classGuards, ...methodGuards];
        const actors = [
          ...classActors,
          ...methodDecorators.filter(({ name }) => name === 'AllowAuthActors').flatMap(({ args }) => args),
        ];
        const methodName = member.name.getText(sourceFile);
        const { classification, issues } = classifyRoute({
          controllerPath,
          classDecorators,
          methodDecorators,
          guards,
          authorization,
          controller: node.name.text,
          method: methodName,
          methodText: member.getText(sourceFile),
        });

        const actor = actors.length
          ? actors.join(', ')
          : guards.some(
                (guard) =>
                  guard.includes('TenantCustomerSessionGuard') ||
                  guard.includes('StorefrontTenantCustomerSessionGuard'),
              )
            ? 'TENANT_CUSTOMER'
            : classification === 'PUBLIC'
              ? 'PUBLIC'
              : classification === 'INTERNAL'
                ? 'INTERNAL'
                : classification === 'EXEMPT' &&
                    (node.name.text === 'GetCurrentUserController' || node.name.text === 'LogoutController')
                  ? 'AUTHENTICATED_ACTOR'
                  : 'TENANT_USER (global default)';

        const permissionParts = authorization
          .filter(({ name }) => name.startsWith('Require'))
          .map(({ name, args }) => `${name}(${args.join(', ')})`);

        routes.push({
          file: relative(repoRoot, file),
          controller: node.name.text,
          method: methodName,
          httpMethod: routeDecorator.name.toUpperCase(),
          path: `/${joinRoutePath(controllerPath, literalValue(routeDecorator.args[0]))}`,
          actor,
          guards,
          permissions: permissionParts.join('; ') || '-',
          classification,
          issues,
        });
      }
    });
  }

  return routes;
}

function printReport(routes: RouteAudit[]): void {
  console.log('| Method | Route | Controller | Actor / guards | Classification | Permission(s) | Status |');
  console.log('|---|---|---|---|---|---|---|');

  for (const route of routes) {
    const actorAndGuards = `${route.actor}${route.guards.length ? `; ${route.guards.join(', ')}` : ''}`;
    const status =
      route.issues.length === 0 && route.classification !== 'MISSING' && route.classification !== 'CONFLICT'
        ? 'OK'
        : `FAIL: ${route.issues.join('; ') || 'missing or conflicting authorization metadata'}`;
    console.log(
      `| ${route.httpMethod} | ${route.path} | ${route.controller}.${route.method} | ${actorAndGuards} | ${route.classification} | ${route.permissions} | ${status} |`,
    );
  }

  const counts = routes.reduce<Record<string, number>>((result, route) => {
    result[route.classification] = (result[route.classification] ?? 0) + 1;
    return result;
  }, {});
  const tenantUserRoutes = routes.filter(
    ({ classification }) =>
      classification === 'STATIC_ONE' ||
      classification === 'STATIC_ANY' ||
      classification === 'STATIC_ALL' ||
      classification === 'CONDITIONAL' ||
      classification === 'EXEMPT' ||
      classification === 'MISSING',
  ).length;
  const fullyClassified = routes.filter(
    ({ classification }) => classification !== 'MISSING' && classification !== 'CONFLICT',
  ).length;
  const findings = routes.filter(
    ({ issues, classification }) => issues.length > 0 || classification === 'MISSING' || classification === 'CONFLICT',
  );

  console.log('\nSummary');
  console.log(`- Routes audited: ${routes.length}`);
  console.log(`- Tenant-user routes audited: ${tenantUserRoutes}`);
  console.log(`- Fully classified: ${fullyClassified}`);
  console.log(`- Missing/incorrect: ${findings.length}`);
  console.log(`- Public routes: ${counts.PUBLIC ?? 0}`);
  console.log(`- Tenant-customer routes: ${counts.TENANT_CUSTOMER ?? 0}`);
  console.log(`- Internal routes: ${counts.INTERNAL ?? 0}`);

  if (findings.length > 0) {
    console.error('\nAuthorization completeness findings:');
    for (const route of findings) {
      console.error(
        `- ${route.httpMethod} ${route.path} (${route.controller}.${route.method}): ${route.issues.join('; ') || 'missing authorization metadata'}`,
      );
    }
    process.exitCode = 1;
  }
}

printReport(auditControllers());
