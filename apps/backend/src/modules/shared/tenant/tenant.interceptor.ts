import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

import { Env } from 'src/config/env.schema';

import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly internalApiToken: string;

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.internalApiToken = this.configService.get('BFF_INTERNAL_TOKEN');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user?.tenantId ?? this.getTrustedTenantId(request.headers);

    if (!tenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      this.tenantContext.run(tenantId, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }

  private getTrustedTenantId(headers: Record<string, unknown>): string | undefined {
    const internalToken = this.getSingleHeaderValue(headers['x-internal-token']);

    if (!internalToken || internalToken !== this.internalApiToken) {
      return undefined;
    }

    return this.getSingleHeaderValue(headers['x-tenant-id']);
  }

  private getSingleHeaderValue(header: unknown): string | undefined {
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }

    if (Array.isArray(header) && typeof header[0] === 'string' && header[0].length > 0) {
      return header[0];
    }

    return undefined;
  }
}
