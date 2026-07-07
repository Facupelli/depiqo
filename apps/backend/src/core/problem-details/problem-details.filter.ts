import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';

import { AppLogger } from 'src/core/logger/app-logger.service';
import { LogContext } from 'src/core/logger/log-context';
import { PROBLEM_DETAILS_CONTENT_TYPE, ProblemDetailsBody } from './problem-details';
import { buildProblemLogEvent } from './problem-log-event';
import { resolveExceptionProblem } from './resolve-exception-problem';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly logger?: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const instance = request.originalUrl || request.url;

    const resolvedProblem = resolveExceptionProblem(exception, instance);

    const body = this.withResponseDefaults(resolvedProblem.problemDetails, {
      status: resolvedProblem.status,
      instance,
      requestId: LogContext.get('requestId'),
    });

    this.logger?.canonical(
      buildProblemLogEvent({
        exception,
        request,
        status: resolvedProblem.status,
        problemDetails: body,
        kind: resolvedProblem.kind,
      }),
    );

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
