import { createNestIntegrationContext, type ProviderOverride } from './create-nest-integration-context';
import { OfferingManagementModule } from '../../../src/modules/offering-management/offering-management.module';

export function createOfferingManagementIntegrationContext(overrides?: readonly ProviderOverride[]) {
  return createNestIntegrationContext(OfferingManagementModule, overrides);
}
