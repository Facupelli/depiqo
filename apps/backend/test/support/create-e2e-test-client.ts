import type { CustomerLoginBodyDto, LoginBodyDto } from '@repo/api-contracts';
import type { INestApplication } from '@nestjs/common';
import request, { type Response, type SuperAgentTest, type Test as SupertestRequest } from 'supertest';

import { CSRF_HEADER_NAME } from '../../src/modules/tenant-management/auth/shared/csrf/csrf.constants';

export type E2ETestClient = {
  request(): SuperAgentTest;
  withCsrf(testRequest: SupertestRequest): SupertestRequest;
  getCsrfToken(): Promise<string>;
  loginTenantUser(credentials: LoginBodyDto): Promise<Response>;
  loginTenantCustomer(credentials: CustomerLoginBodyDto): Promise<Response>;
};

export function createE2ETestClient(app: INestApplication): E2ETestClient {
  const agent = request.agent(app.getHttpServer());
  let csrfToken: string | undefined;

  return {
    request: () => agent,
    withCsrf: (testRequest) => {
      if (!csrfToken) {
        throw new Error('No CSRF token is available. Call getCsrfToken() or log in successfully first.');
      }

      return testRequest.set(CSRF_HEADER_NAME, csrfToken);
    },
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
    loginTenantCustomer: async (credentials) => {
      const response = await agent.post('/auth/customer/login').send(credentials).expect(200);
      csrfToken = readCsrfToken(response);
      return response;
    },
  };
}

function readCsrfToken(response: Response): string {
  const token = (response.body as { data?: { csrfToken?: unknown } } | undefined)?.data?.csrfToken;

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Expected a CSRF token in the response.');
  }

  return token;
}
