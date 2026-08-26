export const PROBLEM_TYPE_BASE_URI = 'https://api.depiqo.com/problems' as const;

export function createProblemType(path: string): `${typeof PROBLEM_TYPE_BASE_URI}/${string}` {
  const normalizedPath = path.trim().replace(/^\/+/, '');

  if (normalizedPath.length === 0) {
    throw new Error('Problem type path cannot be empty.');
  }

  return `${PROBLEM_TYPE_BASE_URI}/${normalizedPath}`;
}

export const PlatformProblemTypes = {
  request: {
    validationFailed: createProblemType('request/validation-failed'),
    badRequest: createProblemType('request/bad-request'),
    notFound: createProblemType('request/not-found'),
    conflict: createProblemType('request/conflict'),
    unprocessableEntity: createProblemType('request/unprocessable-entity'),
    methodNotAllowed: createProblemType('request/method-not-allowed'),
    unsupportedMediaType: createProblemType('request/unsupported-media-type'),
    tooManyRequests: createProblemType('request/too-many-requests'),
  },
  auth: {
    unauthorized: createProblemType('auth/unauthorized'),
    forbidden: createProblemType('auth/forbidden'),
  },
  system: {
    internalServerError: createProblemType('system/internal-server-error'),
    dependencyUnavailable: createProblemType('system/dependency-unavailable'),
  },
} as const;

export type RequestProblemType = (typeof PlatformProblemTypes.request)[keyof typeof PlatformProblemTypes.request];

export type AuthProblemType = (typeof PlatformProblemTypes.auth)[keyof typeof PlatformProblemTypes.auth];

export type SystemProblemType = (typeof PlatformProblemTypes.system)[keyof typeof PlatformProblemTypes.system];

export type PlatformProblemType = RequestProblemType | AuthProblemType | SystemProblemType;
