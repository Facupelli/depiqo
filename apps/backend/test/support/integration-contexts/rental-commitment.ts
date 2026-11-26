import { createNestIntegrationContext, type ProviderOverride } from './create-nest-integration-context';
import { RentalCommitmentModule } from '../../../src/modules/rental-commitment/rental-commitment.module';

export function createRentalCommitmentIntegrationContext(overrides?: readonly ProviderOverride[]) {
  return createNestIntegrationContext(RentalCommitmentModule, overrides);
}
