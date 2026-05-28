export const V2_PROBLEM_TYPE_BASE_URI = 'https://api.depiqo.com/problems/v2' as const;

export function createV2ProblemType(path: string): `${typeof V2_PROBLEM_TYPE_BASE_URI}/${string}` {
  const normalizedPath = path.trim().replace(/^\/+/, '');

  if (normalizedPath.length === 0) {
    throw new Error('V2 problem type path cannot be empty.');
  }

  return `${V2_PROBLEM_TYPE_BASE_URI}/${normalizedPath}`;
}

export const V2PlatformProblemTypes = {
  request: {
    validationFailed: createV2ProblemType('request/validation-failed'),
    badRequest: createV2ProblemType('request/bad-request'),
    notFound: createV2ProblemType('request/not-found'),
    conflict: createV2ProblemType('request/conflict'),
    unprocessableEntity: createV2ProblemType('request/unprocessable-entity'),
    methodNotAllowed: createV2ProblemType('request/method-not-allowed'),
    unsupportedMediaType: createV2ProblemType('request/unsupported-media-type'),
    tooManyRequests: createV2ProblemType('request/too-many-requests'),
  },
  auth: {
    unauthorized: createV2ProblemType('auth/unauthorized'),
    forbidden: createV2ProblemType('auth/forbidden'),
  },
  system: {
    internalServerError: createV2ProblemType('system/internal-server-error'),
    dependencyUnavailable: createV2ProblemType('system/dependency-unavailable'),
  },
} as const;

export type V2RequestProblemType = (typeof V2PlatformProblemTypes.request)[keyof typeof V2PlatformProblemTypes.request];

export type V2AuthProblemType = (typeof V2PlatformProblemTypes.auth)[keyof typeof V2PlatformProblemTypes.auth];

export type V2SystemProblemType = (typeof V2PlatformProblemTypes.system)[keyof typeof V2PlatformProblemTypes.system];

export type V2PlatformProblemType = V2RequestProblemType | V2AuthProblemType | V2SystemProblemType;
