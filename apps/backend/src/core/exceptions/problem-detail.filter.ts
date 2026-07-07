import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetails } from '@repo/schemas';
import { ObjectStorageProviderError } from 'src/modules/object-storage/application/errors/object-storage-provider.error';
import { ProblemException } from '../problem-details';

type HandlerResult = { status: number; problemDetails: ProblemDetails };

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.dir({ exception }, { depth: null });

    const { status, problemDetails } = this.resolve(exception, request);

    response
      .status(status)
      .contentType('application/problem+json')
      .json({ ...problemDetails, instance: problemDetails.instance ?? request.url });
  }

  // TODO: improve architecture
  private resolve(exception: unknown, request: Request): HandlerResult {
    return (
      this.tryHandleProblemException(exception) ??
      this.tryHandleProblemException(exception) ??
      this.tryHandleObjectStorageProviderError(exception, request) ??
      this.tryHandleValidationException(exception, request) ??
      this.tryHandleHttpException(exception, request) ??
      this.handleUnknownException(exception, request)
    );
  }

  private tryHandleProblemException(exception: unknown): HandlerResult | null {
    if (!(exception instanceof ProblemException)) return null;

    return {
      status: exception.getStatus(),
      problemDetails: exception.getProblemDetails(),
    };
  }

  private tryHandleObjectStorageProviderError(exception: unknown, request: Request): HandlerResult | null {
    if (!(exception instanceof ObjectStorageProviderError)) return null;

    return {
      status: HttpStatus.BAD_GATEWAY,
      problemDetails: {
        type: 'errors://object-storage-unavailable',
        title: 'Object Storage Unavailable',
        status: HttpStatus.BAD_GATEWAY,
        detail: `The requested operation could not be completed because ${exception.provider} object storage is unavailable.`,
        instance: request.url,
      },
    };
  }

  private tryHandleValidationException(exception: unknown, request: Request): HandlerResult | null {
    if (!(exception instanceof HttpException)) {
      return null;
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return null;
    }

    const responseObj = exceptionResponse as Record<string, any>;
    const status = exception.getStatus();

    if (Array.isArray(responseObj.errors)) {
      console.dir(responseObj.errors, { depth: null });
      return {
        status,
        problemDetails: {
          type: 'errors://validation-error',
          title: 'Validation Failed',
          status,
          detail: 'Input data validation failed',
          instance: request.url,
          errors: responseObj.errors,
        },
      };
    }

    if (Array.isArray(responseObj.message)) {
      return {
        status,
        problemDetails: {
          type: 'errors://validation-error',
          title: 'Validation Failed',
          status,
          detail: 'Input data validation failed',
          instance: request.url,
          errors: responseObj.message,
        },
      };
    }

    return null;
  }

  private tryHandleHttpException(exception: unknown, request: Request): HandlerResult | null {
    if (!(exception instanceof HttpException)) return null;

    const exceptionResponse = exception.getResponse();
    const status = exception.getStatus();
    const detail =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as any).message ?? exception.message);

    return {
      status,
      problemDetails: {
        type: 'errors://http-error',
        title: exception.name,
        status,
        detail,
        instance: request.url,
      },
    };
  }

  private handleUnknownException(exception: unknown, request: Request): HandlerResult {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    this.logger.error(`Internal Server Error: ${message}`, exception instanceof Error ? exception.stack : undefined);

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      problemDetails: {
        type: 'errors://internal-server-error',
        title: 'Internal Server Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: 'An unexpected error occurred. Please try again later.',
        instance: request.url,
      },
    };
  }
}
