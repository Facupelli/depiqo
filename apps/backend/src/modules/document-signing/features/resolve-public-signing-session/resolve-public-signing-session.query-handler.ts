import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { PublicSigningSessionLoader } from '../../application/public-signing-session.loader';
import { PublicSigningSessionError } from '../../application/public-signing-session.errors';
import { ResolvePublicSigningSessionQuery } from './resolve-public-signing-session.query';

@QueryHandler(ResolvePublicSigningSessionQuery)
export class ResolvePublicSigningSessionQueryHandler implements IQueryHandler<
  ResolvePublicSigningSessionQuery,
  Result<{ requestId: string }, PublicSigningSessionError>
> {
  constructor(private readonly publicSigningSessionLoader: PublicSigningSessionLoader) {}

  async execute(
    query: ResolvePublicSigningSessionQuery,
  ): Promise<Result<{ requestId: string }, PublicSigningSessionError>> {
    const requestResult = await this.publicSigningSessionLoader.loadRequiredPublicSession(query.rawToken);
    if (requestResult.isErr()) {
      return err(requestResult.error);
    }

    return ok({ requestId: requestResult.value.id });
  }
}
