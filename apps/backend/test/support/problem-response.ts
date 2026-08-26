import { PlatformProblemTypes, PROBLEM_DETAILS_CONTENT_TYPE } from '../../src/core/problem-details';
import type { Response } from 'supertest';

export type ExpectedProblemResponse = {
  status: number;
  type: string;
  code?: string;
};

export function expectProblemResponse(response: Response, expected: ExpectedProblemResponse): void {
  expect(response.type).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
  expect(response.status).toBe(expected.status);

  const problem = response.body as Record<string, unknown>;

  expect(problem).toEqual(
    expect.objectContaining({
      type: expected.type,
      status: expected.status,
      title: expect.any(String),
      detail: expect.any(String),
      instance: expect.any(String),
    }),
  );

  if ('requestId' in problem) {
    expect(problem.requestId).toEqual(expect.any(String));
  }

  if (expected.code !== undefined) {
    expect(problem.code).toBe(expected.code);
  }
}

export function expectValidationProblem(response: Response): void {
  expectProblemResponse(response, {
    status: 400,
    type: PlatformProblemTypes.request.validationFailed,
  });

  const invalidParams = (response.body as Record<string, unknown>)['invalid-params'];

  expect(invalidParams).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: expect.any(String),
        reason: expect.any(String),
      }),
    ]),
  );
}
