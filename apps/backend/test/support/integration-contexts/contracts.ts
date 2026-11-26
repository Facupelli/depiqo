import { createNestIntegrationContext, type ProviderOverride } from './create-nest-integration-context';
import { ContractsModule } from '../../../src/modules/contracts/contracts.module';

export function createContractsIntegrationContext(overrides?: readonly ProviderOverride[]) {
  return createNestIntegrationContext(ContractsModule, overrides);
}
