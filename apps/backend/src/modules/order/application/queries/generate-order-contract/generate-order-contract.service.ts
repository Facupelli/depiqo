import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Result } from 'neverthrow';

import { OrderDocumentRendererService } from 'src/modules/order/application/pdf/order-document-renderer.service';
import { ContractCustomerProfileMissingError } from 'src/modules/order/domain/errors/contract.errors';

import { GenerateOrderContractQuery, GenerateOrderContractResult } from './generate-order-contract.query';

type GenerateOrderContractQueryResult = Result<GenerateOrderContractResult, ContractCustomerProfileMissingError>;

@QueryHandler(GenerateOrderContractQuery)
export class GenerateOrderContractService implements IQueryHandler<
  GenerateOrderContractQuery,
  GenerateOrderContractQueryResult
> {
  constructor(private readonly orderDocumentRenderer: OrderDocumentRendererService) {}

  async execute(query: GenerateOrderContractQuery): Promise<GenerateOrderContractQueryResult> {
    return this.orderDocumentRenderer.renderContract(query.tenantId, query.orderId);
  }
}
