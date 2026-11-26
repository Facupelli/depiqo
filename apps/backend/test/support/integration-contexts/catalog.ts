import { createNestIntegrationContext } from './create-nest-integration-context';
import { CatalogModule } from '../../../src/modules/catalog/catalog.module';

export function createCatalogIntegrationContext() {
  return createNestIntegrationContext(CatalogModule);
}
