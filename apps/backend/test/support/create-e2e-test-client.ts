import type { CustomerLoginBodyDto, LoginBodyDto } from '@repo/api-contracts';
import { STOREFRONT_TENANT_CONTEXT_HEADER_NAME } from '@repo/api-contracts';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';
import request, { type Response, type SuperAgentTest, type Test as SupertestRequest } from 'supertest';

import { Env } from '../../src/config/env.schema';
import { CSRF_HEADER_NAME } from '../../src/modules/tenant-management/auth/shared/csrf/csrf.constants';

export type E2EStorefrontTenantContext = {
  tenantId: string;
  canonicalHost: string;
  host?: string;
};

export type E2ETestClient = {
  request(): SuperAgentTest;
  withCsrf(testRequest: SupertestRequest): SupertestRequest;
  withStorefrontTenantContext(
    testRequest: SupertestRequest,
    storefrontTenant: E2EStorefrontTenantContext,
  ): Promise<void>;
  getCsrfToken(): Promise<string>;
  loginTenantUser(credentials: LoginBodyDto): Promise<Response>;
  loginTenantCustomer(
    credentials: CustomerLoginBodyDto,
    storefrontTenant: E2EStorefrontTenantContext,
  ): Promise<Response>;
};

export function createE2ETestClient(app: INestApplication): E2ETestClient {
  const agent = request.agent(app.getHttpServer());
  const configService = app.get(ConfigService<Env, true>);
  let csrfToken: string | undefined;

  async function withStorefrontTenantContext(
    testRequest: SupertestRequest,
    storefrontTenant: E2EStorefrontTenantContext,
  ): Promise<void> {
    const host = storefrontTenant.host ?? storefrontTenant.canonicalHost;
    const returnHost = isLocalStorefrontHost(host) ? host : undefined;
    const issuedAt = Math.floor(Date.now() / 1000);
    const secret = new TextEncoder().encode(configService.get('STOREFRONT_TENANT_JWT_SECRET'));
    const token = await new SignJWT({
      scope: 'public-storefront',
      tenant_id: storefrontTenant.tenantId,
      host,
      canonical_host: storefrontTenant.canonicalHost,
      ...(returnHost ? { return_host: returnHost } : {}),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(configService.get('STOREFRONT_TENANT_JWT_ISSUER'))
      .setAudience(configService.get('STOREFRONT_TENANT_JWT_AUDIENCE'))
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + 60)
      .sign(secret);

    testRequest.set(STOREFRONT_TENANT_CONTEXT_HEADER_NAME, token).set('Host', host);
  }

  return {
    request: () => agent,
    withCsrf: (testRequest) => {
      if (!csrfToken) {
        throw new Error('No CSRF token is available. Call getCsrfToken() or log in successfully first.');
      }

      return testRequest.set(CSRF_HEADER_NAME, csrfToken);
    },
    withStorefrontTenantContext,
    getCsrfToken: async () => {
      const response = await agent.get('/auth/csrf').expect(200);
      const token = readCsrfToken(response);
      csrfToken = token;
      return token;
    },
    loginTenantUser: async (credentials) => {
      const response = await agent.post('/auth/login').send(credentials).expect(200);
      csrfToken = readCsrfToken(response);
      return response;
    },
    loginTenantCustomer: async (credentials, storefrontTenant) => {
      const loginRequest = agent.post('/auth/customer/login');
      await withStorefrontTenantContext(loginRequest, storefrontTenant);
      const response = await loginRequest.send(credentials).expect(200);
      csrfToken = readCsrfToken(response);
      return response;
    },
  };
}

function isLocalStorefrontHost(host: string): boolean {
  return host === 'localhost' || host.endsWith('.localhost');
}

function readCsrfToken(response: Response): string {
  const token = (response.body as { data?: { csrfToken?: unknown } } | undefined)?.data?.csrfToken;

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Expected a CSRF token in the response.');
  }

  return token;
}
