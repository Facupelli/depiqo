import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';

import { LogContext } from 'src/core/logger/log-context';
import { applyHttpErrorStackPolicy } from 'src/core/logger/pino-error.serializer';

import { PROBLEM_DETAILS_CONTENT_TYPE, ProblemDetailsBody } from './problem-details';
import { buildProblemLogInformation } from './problem-log-event';
import { resolveExceptionProblem } from './resolve-exception-problem';

interface ResponseWithLoggingError extends Response {
  err?: Error;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly isProduction = false) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<ResponseWithLoggingError>();
    const instance = request.originalUrl || request.url;

    const resolvedProblem = resolveExceptionProblem(exception, instance);
    const body = this.withResponseDefaults(resolvedProblem.problemDetails, {
      status: resolvedProblem.status,
      instance,
      requestId: LogContext.forRequest(request)?.requestId ?? LogContext.get('requestId'),
    });

    const logInformation = buildProblemLogInformation({
      exception,
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
    return {
      ...problemDetails,
      status: defaults.status,
      instance: problemDetails.instance ?? defaults.instance,
      requestId: problemDetails.requestId ?? defaults.requestId,
    };
  }
}
