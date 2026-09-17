import type { JsonObject, JsonValue } from 'src/core/types/json-value';

export const PROBLEM_DETAILS_CONTENT_TYPE = 'application/problem+json' as const;

interface ProblemDetailsStandardMembers {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
}

export type ProblemDetailsBody = ProblemDetailsStandardMembers & JsonObject;

export interface ProblemDetailsExtensions {
  [extension: string]: JsonValue;
}

export interface InvalidParam extends JsonObject {
  name: string;
  reason: string;
}
