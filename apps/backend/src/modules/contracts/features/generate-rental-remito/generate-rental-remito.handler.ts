import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  RenderRentalRemitoResult,
  RenderRentalRemitoUseCaseResult,
  RentalRemitoDocumentService,
} from '../../application/rental-remito/rental-remito-document.service';
import { GenerateRentalRemitoQuery } from './generate-rental-remito.query';

export type GenerateRentalRemitoResult = RenderRentalRemitoUseCaseResult;
export type GenerateRentalRemitoReadModel = RenderRentalRemitoResult;

@QueryHandler(GenerateRentalRemitoQuery)
export class GenerateRentalRemitoHandler implements IQueryHandler<
  GenerateRentalRemitoQuery,
  GenerateRentalRemitoResult
> {
  constructor(private readonly documentService: RentalRemitoDocumentService) {}

  execute(query: GenerateRentalRemitoQuery): Promise<GenerateRentalRemitoResult> {
    return this.documentService.render({
      tenantId: query.tenantId,
      rentalId: query.rentalId,
      purpose: 'preview',
    });
  }
}
