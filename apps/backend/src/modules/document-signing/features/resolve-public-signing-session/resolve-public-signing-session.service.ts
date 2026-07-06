import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import {
  PublicSigningSessionLoader,
  PublicSigningSessionLoaderError,
} from '../../application/public-signing-session.loader';
import { ResolvePublicSigningSessionResult } from './resolve-public-signing-session.result';
import { ResolvePublicSigningSessionQuery } from './resolve-public-signing-session.query';

export type ResolvePublicSigningSessionQueryError = PublicSigningSessionLoaderError;

@Injectable()
@QueryHandler(ResolvePublicSigningSessionQuery)
export class ResolvePublicSigningSessionService implements IQueryHandler<
  ResolvePublicSigningSessionQuery,
  Result<ResolvePublicSigningSessionResult, ResolvePublicSigningSessionQueryError>
> {
  constructor(private readonly publicSigningSessionLoader: PublicSigningSessionLoader) {}

  async execute(
    query: ResolvePublicSigningSessionQuery,
  ): Promise<Result<ResolvePublicSigningSessionResult, ResolvePublicSigningSessionQueryError>> {
    const sessionResult = await this.publicSigningSessionLoader.load({
      rawToken: query.rawToken,
      allowedStatuses: [V2DocumentSigningRequestStatus.SENT, V2DocumentSigningRequestStatus.VIEWED],
      markViewed: true,
    });

    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    return ok({
      requestId: sessionResult.value.id,
    });
  }
}
