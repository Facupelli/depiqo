import { HttpStatus } from '@nestjs/common';
import { PlatformProblemTypes } from './platform-problem-types';

export interface HttpProblemDefaults {
  type: string;
  title: string;
  detail: string;
}

export function httpProblemDefaults(status: number): HttpProblemDefaults {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return {
        type: PlatformProblemTypes.request.badRequest,
        title: 'Bad request',
        detail: 'The request could not be understood or processed.',
      };

    case HttpStatus.UNAUTHORIZED:
      return {
        type: PlatformProblemTypes.auth.unauthorized,
        title: 'Unauthorized',
        detail: 'Authentication is required to access this resource.',
      };

    case HttpStatus.FORBIDDEN:
      return {
        type: PlatformProblemTypes.auth.forbidden,
        title: 'Forbidden',
        detail: 'You do not have permission to access this resource.',
      };

    case HttpStatus.NOT_FOUND:
      return {
        type: PlatformProblemTypes.request.notFound,
        title: 'Not found',
        detail: 'The requested resource could not be found.',
      };

    case HttpStatus.METHOD_NOT_ALLOWED:
      return {
        type: PlatformProblemTypes.request.methodNotAllowed,
        title: 'Method not allowed',
        detail: 'The requested HTTP method is not allowed for this resource.',
      };

    case HttpStatus.CONFLICT:
      return {
        type: PlatformProblemTypes.request.conflict,
        title: 'Conflict',
        detail: 'The request conflicts with the current state of the resource.',
      };

    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return {
        type: PlatformProblemTypes.request.unsupportedMediaType,
        title: 'Unsupported media type',
        detail: 'The request media type is not supported.',
      };

    case HttpStatus.UNPROCESSABLE_ENTITY:
      return {
        type: PlatformProblemTypes.request.unprocessableEntity,
        title: 'Unprocessable entity',
        detail: 'The request was well-formed but could not be processed.',
      };

    case HttpStatus.TOO_MANY_REQUESTS:
      return {
        type: PlatformProblemTypes.request.tooManyRequests,
        title: 'Too many requests',
        detail: 'Too many requests were sent in a given amount of time.',
      };

    case HttpStatus.SERVICE_UNAVAILABLE:
      return {
        type: PlatformProblemTypes.system.dependencyUnavailable,
        title: 'Dependency unavailable',
        detail: 'A required dependency is temporarily unavailable.',
      };

    default:
      return status >= 500 ? internalServerErrorDefaults() : badRequestDefaults();
  }
}

export function safeHttpDetail(status: number, fallback: string): string {
  if (status >= 500) {
    return internalServerErrorDefaults().detail;
  }

  return fallback;
}

function internalServerErrorDefaults(): HttpProblemDefaults {
  return {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    detail: 'An unexpected error occurred. Please try again later.',
  };
}

function badRequestDefaults(): HttpProblemDefaults {
  return {
    type: PlatformProblemTypes.request.badRequest,
    title: 'Bad request',
    detail: 'The request could not be understood or processed.',
  };
}
