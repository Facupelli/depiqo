import { createNestIntegrationContext } from './create-nest-integration-context';
import { PricingModule } from '../../../src/modules/pricing/pricing.module';

export function createPricingIntegrationContext() {
  return createNestIntegrationContext(PricingModule);
}
