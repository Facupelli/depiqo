import { V2ProblemDetailsBody, V2ProblemDetailsExtensions } from './problem-details';

const RESERVED_PROBLEM_DETAIL_KEYS = new Set(['type', 'title', 'status', 'detail', 'instance']);

export interface CreateV2ProblemDetailsInput {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
  extensions?: V2ProblemDetailsExtensions;
}

export function createV2ProblemDetails(input: CreateV2ProblemDetailsInput): V2ProblemDetailsBody {
  assertNoReservedV2ProblemExtensionKeys(input.extensions);

  return {
    type: input.type,
    title: input.title,
    status: input.status,
    detail: input.detail,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...input.extensions,
  };
}

export function assertNoReservedV2ProblemExtensionKeys(extensions?: V2ProblemDetailsExtensions): void {
  if (!extensions) return;

  const reservedKeys = Object.keys(extensions).filter((key) => RESERVED_PROBLEM_DETAIL_KEYS.has(key));

  if (reservedKeys.length === 0) return;

  throw new Error(`Problem Details extensions cannot override reserved member(s): ${reservedKeys.join(', ')}`);
}
