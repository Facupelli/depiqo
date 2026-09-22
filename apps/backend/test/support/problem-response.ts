import { expect } from 'vitest';

import {
  PlatformProblemTypes,
  PROBLEM_DETAILS_CONTENT_TYPE,
  type ProblemDetailsBody,
} from '../../src/core/problem-details';
import type { Response } from 'supertest';

export type ExpectedProblemResponse = {
  status: number;
  type: string;
  code?: string;
};

export function expectProblemResponse(response: Response, expected: ExpectedProblemResponse): void {
  expect(response.type).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
  expect(response.status).toBe(expected.status);

  // SAFETY: The fixture or preceding response assertions establish this object shape before these fields are inspected.
  const problem = response.body as ProblemDetailsBody;

  expect(problem).toEqual(
    expect.objectContaining({
      type: expected.type,
      status: expected.status,
      title: expect.any(String),
      detail: expect.any(String),
      instance: expect.any(String),
    }),
  );

  expect(problem.requestId).toEqual(expect.any(String));
  expect(problem.requestId).not.toBe('undefined');
  expect(problem.requestId).not.toBe('null');
  expect(response.headers['x-request-id']).toBe(problem.requestId);

  if (expected.code !== undefined) {
    expect(problem.code).toBe(expected.code);
  }
}

export function expectValidationProblem(response: Response): void {
  expectProblemResponse(response, {
    status: 400,
    type: PlatformProblemTypes.request.validationFailed,
  });

  // SAFETY: The fixture or preceding response assertions establish this object shape before these fields are inspected.
  const invalidParams = (response.body as ProblemDetailsBody)['invalid-params'];

  expect(invalidParams).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: expect.any(String),
        reason: expect.any(String),
      }),
    ]),
  );
}
