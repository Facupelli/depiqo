import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PublicSigningSessionLoader } from '../../public-signing-session.loader';
import { ResolvePublicSigningSessionQuery } from './resolve-public-signing-session.query';

@QueryHandler(ResolvePublicSigningSessionQuery)
export class ResolvePublicSigningSessionQueryHandler implements IQueryHandler<
  ResolvePublicSigningSessionQuery,
  { requestId: string }
> {
  constructor(private readonly publicSigningSessionLoader: PublicSigningSessionLoader) {}

  async execute(query: ResolvePublicSigningSessionQuery): Promise<{ requestId: string }> {
    const request = await this.publicSigningSessionLoader.loadRequiredPublicSession(query.rawToken);
    return { requestId: request.id };
  }
}
