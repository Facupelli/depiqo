import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

import { LogContext } from 'src/core/logger/log-context';
import { applyHttpErrorStackPolicy } from 'src/core/logger/pino-error.serializer';
import { readRequestId } from 'src/core/logger/request-id';

import { PROBLEM_DETAILS_CONTENT_TYPE, ProblemDetailsBody } from './problem-details';
import { buildProblemLogInformation } from './problem-log-event';
import { resolveExceptionProblem } from './resolve-exception-problem';

interface ResponseWithLoggingError extends Response {
  err?: Error;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly isProduction = false) {}

  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<ResponseWithLoggingError>();
    const instance = request.originalUrl || request.url;

    const resolvedProblem = resolveExceptionProblem(error, instance);
    const body = this.withResponseDefaults(resolvedProblem.problemDetails, {
      status: resolvedProblem.status,
      instance,
      requestId: readRequestId(request),
    });

    const logInformation = buildProblemLogInformation({
      error,
      status: resolvedProblem.status,
      problemDetails: body,
      kind: resolvedProblem.kind,
    });

    const requestLogContext = LogContext.forRequest(request);
    if (requestLogContext) {
      requestLogContext.problem = logInformation.context;
    }
    LogContext.set('problem', logInformation.context);

    applyHttpErrorStackPolicy(logInformation.error, resolvedProblem.status, this.isProduction);
    response.err = logInformation.error;

    response.status(resolvedProblem.status).contentType(PROBLEM_DETAILS_CONTENT_TYPE).json(body);
  }

  private withResponseDefaults(
    problemDetails: ProblemDetailsBody,
    defaults: {
      status: number;
      instance: string;
      requestId?: string;
    },
  ): ProblemDetailsBody {
    const responseDetails = { ...problemDetails };
    delete responseDetails.requestId;

    return {
      ...responseDetails,
      status: defaults.status,
      instance: problemDetails.instance ?? defaults.instance,
      ...(defaults.requestId === undefined ? {} : { requestId: defaults.requestId }),
    };
  }
}
