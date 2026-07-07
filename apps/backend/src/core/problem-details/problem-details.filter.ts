import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

import { LogContext } from 'src/core/logger/log-context';

import { createProblemDetails } from './problem-details.factory';
import { InvalidParam, PROBLEM_DETAILS_CONTENT_TYPE, ProblemDetailsBody } from './problem-details';
import { PlatformProblemTypes } from './platform-problem-types';
import { createValidationProblem } from './validation-problem.factory';
import { ProblemException } from './problem.exception';

type HandlerResult = { status: number; problemDetails: ProblemDetailsBody };

interface HttpProblemDefaults {
  type: string;
  title: string;
  detail: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, problemDetails } = this.resolve(exception, request);
    const body = {
      ...problemDetails,
      status,
      instance: problemDetails.instance ?? this.getRequestInstance(request),
    };

    this.enrichCanonicalLog(exception, body);

    response.status(status).contentType(PROBLEM_DETAILS_CONTENT_TYPE).json(body);
  }

  private resolve(exception: unknown, request: Request): HandlerResult {
    return (
      this.tryHandleProblemException(exception, request) ??
      this.tryHandleValidationException(exception, request) ??
      this.tryHandleHttpException(exception, request) ??
      this.handleUnknownException(exception, request)
    );
  }

  private tryHandleProblemException(exception: unknown, request: Request): HandlerResult | null {
    if (!(exception instanceof ProblemException)) return null;

    const status = exception.getStatus();
    const problemDetails = exception.getProblemDetails();

    return {
      status,
      problemDetails: {
        ...problemDetails,
        status,
        instance: problemDetails.instance ?? this.getRequestInstance(request),
      },
    };
  }

  private tryHandleValidationException(exception: unknown, request: Request): HandlerResult | null {
    if (!(exception instanceof HttpException)) return null;

    const responseBody = exception.getResponse();
    const invalidParams = this.toInvalidParams(responseBody);

    if (invalidParams.length === 0) return null;

    const status = exception.getStatus();

    return {
      status,
      problemDetails: createValidationProblem({
        type: PlatformProblemTypes.request.validationFailed,
        status,
        instance: this.getRequestInstance(request),
        invalidParams,
      }),
    };
  }

  private tryHandleHttpException(exception: unknown, request: Request): HandlerResult | null {
    if (!(exception instanceof HttpException)) return null;

    const status = exception.getStatus();
    const defaults = this.httpProblemDefaults(status);

    return {
      status,
      problemDetails: createProblemDetails({
        type: defaults.type,
        title: defaults.title,
        status,
        detail: this.safeHttpDetail(status, defaults.detail),
        instance: this.getRequestInstance(request),
      }),
    };
  }

  private handleUnknownException(_exception: unknown, request: Request): HandlerResult {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    return {
      status,
      problemDetails: createProblemDetails({
        type: PlatformProblemTypes.system.internalServerError,
        title: 'Internal server error',
        status,
        detail: 'An unexpected error occurred. Please try again later.',
        instance: this.getRequestInstance(request),
      }),
    };
  }

  private httpProblemDefaults(status: number): HttpProblemDefaults {
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
        if (status >= 500) {
          return {
            type: PlatformProblemTypes.system.internalServerError,
            title: 'Internal server error',
            detail: 'An unexpected error occurred. Please try again later.',
          };
        }

        return {
          type: PlatformProblemTypes.request.badRequest,
          title: 'Bad request',
          detail: 'The request could not be understood or processed.',
        };
    }
  }

  private safeHttpDetail(status: number, fallback: string): string {
    if (status >= 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    return fallback;
  }

  private toInvalidParams(responseBody: unknown): InvalidParam[] {
    if (typeof responseBody !== 'object' || responseBody === null) return [];

    const responseObj = responseBody as Record<string, unknown>;

    if (this.hasInvalidParams(responseObj)) {
      return responseObj['invalid-params'];
    }

    const errors = responseObj.errors;
    const message = responseObj.message;

    if (Array.isArray(errors)) {
      return this.normalizeValidationArray(errors);
    }

    if (Array.isArray(message)) {
      return this.normalizeValidationArray(message);
    }

    return [];
  }

  private normalizeValidationArray(errors: unknown[]): InvalidParam[] {
    const invalidParams = errors.flatMap((error) => this.normalizeValidationEntry(error));

    return invalidParams.length > 0 ? invalidParams : [{ name: 'request', reason: 'Invalid request.' }];
  }

  private normalizeValidationEntry(error: unknown): InvalidParam[] {
    if (typeof error === 'string') {
      return [{ name: 'request', reason: error }];
    }

    if (typeof error !== 'object' || error === null) {
      return [];
    }

    const errorObj = error as Record<string, unknown>;

    if (this.hasInvalidParam(errorObj)) {
      return [{ name: errorObj.name, reason: errorObj.reason }];
    }

    if (this.hasClassValidatorConstraints(errorObj)) {
      return this.normalizeClassValidatorConstraint(errorObj);
    }

    const nestedErrors = errorObj.errors ?? errorObj.children;
    const nestedInvalidParams = Array.isArray(nestedErrors)
      ? this.normalizeValidationArray(nestedErrors).map((param) => this.prefixNestedParam(errorObj, param))
      : [];

    const name = this.validationPath(errorObj);
    const reason = this.validationReason(errorObj);
    const currentInvalidParam = reason ? [{ name, reason }] : [];

    return [...currentInvalidParam, ...nestedInvalidParams];
  }

  private normalizeClassValidatorConstraint(error: Record<string, unknown>): InvalidParam[] {
    const constraints = error.constraints as Record<string, unknown>;
    const name = this.validationPath(error);

    return Object.values(constraints)
      .filter((message): message is string => typeof message === 'string' && message.length > 0)
      .map((reason) => ({ name, reason }));
  }

  private prefixNestedParam(parent: Record<string, unknown>, param: InvalidParam): InvalidParam {
    const parentName = this.validationPath(parent);

    if (parentName === 'request' || param.name === 'request') return param;
    if (param.name.startsWith(`${parentName}.`)) return param;

    return {
      name: `${parentName}.${param.name}`,
      reason: param.reason,
    };
  }

  private hasInvalidParams(value: Record<string, unknown>): value is Record<string, unknown> & {
    'invalid-params': InvalidParam[];
  } {
    const invalidParams = value['invalid-params'];

    return Array.isArray(invalidParams) && invalidParams.every((param) => this.isInvalidParam(param));
  }

  private hasInvalidParam(value: Record<string, unknown>): value is Record<string, unknown> & InvalidParam {
    return this.isInvalidParam(value);
  }

  private isInvalidParam(value: unknown): value is InvalidParam {
    if (typeof value !== 'object' || value === null) return false;

    const candidate = value as Record<string, unknown>;

    return typeof candidate.name === 'string' && typeof candidate.reason === 'string';
  }

  private hasClassValidatorConstraints(value: Record<string, unknown>): boolean {
    return typeof value.constraints === 'object' && value.constraints !== null;
  }

  private validationPath(error: Record<string, unknown>): string {
    const path = error.path ?? error.property ?? error.field ?? error.name;

    if (Array.isArray(path)) return path.map(String).filter(Boolean).join('.') || 'request';
    if (typeof path === 'string' && path.length > 0) return path;
    if (typeof path === 'number') return String(path);

    return 'request';
  }

  private validationReason(error: Record<string, unknown>): string | null {
    const message = error.message ?? error.reason;

    if (typeof message === 'string' && message.length > 0) return message;

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string').join('; ') || null;
    }

    return null;
  }

  private getRequestInstance(request: Request): string {
    return request.originalUrl || request.url;
  }

  private enrichCanonicalLog(exception: unknown, problemDetails: ProblemDetailsBody): void {
    LogContext.set('httpStatus', problemDetails.status);
    LogContext.set('errorCode', problemDetails.type);
    LogContext.set('errorMessage', this.canonicalErrorMessage(exception, problemDetails));
    LogContext.set('problemType', problemDetails.type);
    LogContext.set('problemTitle', problemDetails.title);
    LogContext.set('problemDetail', problemDetails.detail);
  }

  private canonicalErrorMessage(exception: unknown, problemDetails: ProblemDetailsBody): string {
    if (exception instanceof ProblemException) return problemDetails.detail;

    if (exception instanceof Error) return exception.message;

    return problemDetails.detail;
  }
}
