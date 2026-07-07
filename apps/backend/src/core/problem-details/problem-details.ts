export const PROBLEM_DETAILS_CONTENT_TYPE = 'application/problem+json' as const;

export interface ProblemDetailsBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [extension: string]: unknown;
}

export type ProblemDetailsExtensions = Record<string, unknown>;

export interface InvalidParam {
  name: string;
  reason: string;
}
