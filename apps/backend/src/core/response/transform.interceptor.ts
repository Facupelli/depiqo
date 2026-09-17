import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { IS_PAGINATED_KEY } from '../decorators/paginated-response.decorator';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const message = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isPaginated = this.reflector.getAllAndOverride<boolean>(IS_PAGINATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((payload) => {
        if (isPaginated) {
          return {
            data: payload.data,
            meta: payload.meta,
            ...(message ? { message } : {}),
          };
        }

        return {
          data: payload ?? null,
          ...(message ? { message } : {}),
        };
      }),
    );
  }
}
