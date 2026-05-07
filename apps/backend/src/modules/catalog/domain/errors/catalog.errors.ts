import { DomainError } from 'src/core/exceptions/domain.error';

export class CatalogError extends DomainError {}

export class ProductTypeNotFoundError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Product type '${productTypeId}' was not found.`);
  }
}

export class ProductCategoryNotFoundError extends CatalogError {
  constructor(productCategoryId: string) {
    super(`Product category '${productCategoryId}' was not found.`);
  }
}

export class ProductCategoryHasAssignedProductTypesError extends CatalogError {
  constructor(productCategoryId: string) {
    super(`Product category '${productCategoryId}' cannot be deleted because it still has assigned product types.`);
  }
}

export class ReferencedProductTypeNotFoundError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Referenced product type '${productTypeId}' was not found.`);
  }
}

export class BundleNotFoundError extends CatalogError {
  constructor(bundleId: string) {
    super(`Bundle '${bundleId}' was not found.`);
  }
}

export class InvalidProductTypeNameError extends CatalogError {
  constructor() {
    super('Product type name cannot be empty.');
  }
}

export class ProductTypeAlreadyRetiredError extends CatalogError {
  constructor() {
    super('This product type is already retired.');
  }
}

export class ProductTypeAlreadyPublishedError extends CatalogError {
  constructor() {
    super('This product type is already published.');
  }
}

export class ProductTypeCannotBePublishedWithoutPricingTiersError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Product type '${productTypeId}' cannot be published without at least one pricing tier.`);
  }
}

export class AccessoryProductTypeCannotBePublishedError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Accessory product type '${productTypeId}' cannot be published.`);
  }
}

export class AccessoryLinkPrimaryMustBePrimaryError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Product type '${productTypeId}' must be a primary rental item to have accessory links.`);
  }
}

export class AccessoryLinkAccessoryMustBeAccessoryError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Product type '${productTypeId}' must be an accessory rental item to be linked as an accessory.`);
  }
}

export class AccessoryLinkCrossTenantError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Accessory product type '${productTypeId}' does not belong to the same tenant as the primary rental item.`);
  }
}

export class InvalidAccessoryLinkDefaultQuantityError extends CatalogError {
  constructor() {
    super('Accessory link default quantity must be greater than zero.');
  }
}

export class DuplicateAccessoryLinkError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Accessory product type '${productTypeId}' appears more than once in the accessory link list.`);
  }
}

export class ProductTypeCannotBePublishedWithoutAssetsError extends CatalogError {
  constructor(productTypeId: string) {
    super(`Product type '${productTypeId}' cannot be published without active assets.`);
  }
}

export class ProductTypeCannotBePublishedWithoutActiveOwnerContractsError extends CatalogError {
  constructor(productTypeId: string, assetId: string, ownerId: string) {
    super(
      `Product type '${productTypeId}' cannot be published because asset '${assetId}' from owner '${ownerId}' has no active owner contract.`,
    );
  }
}

export class InvalidProductCategoryNameError extends CatalogError {
  constructor() {
    super('Product category name cannot be empty.');
  }
}

export class InvalidBundleNameError extends CatalogError {
  constructor() {
    super('Bundle name cannot be empty.');
  }
}

export class InvalidBundleComponentQuantityError extends CatalogError {
  constructor() {
    super('Bundle component quantity must be greater than zero.');
  }
}

export class DuplicateBundleComponentError extends CatalogError {
  constructor(productTypeId: string) {
    super(`A component for product type '${productTypeId}' already exists in this bundle.`);
  }
}

export class BundleComponentNotFoundError extends CatalogError {
  constructor(productTypeId: string) {
    super(`No component for product type '${productTypeId}' found in this bundle.`);
  }
}

export class BundleAlreadyRetiredError extends CatalogError {
  constructor() {
    super('This bundle is already retired.');
  }
}

export class BundleAlreadyPublishedError extends CatalogError {
  constructor() {
    super('This bundle is already published.');
  }
}

export class BundleCannotBePublishedWithoutPricingTiersError extends CatalogError {
  constructor(bundleId: string) {
    super(`Bundle '${bundleId}' cannot be published without at least one pricing tier.`);
  }
}

export class BundleCannotBePublishedBecauseAComponentHasNoAssetsError extends CatalogError {
  constructor(bundleId: string, productTypeId: string) {
    super(
      `Bundle '${bundleId}' cannot be published because component product type '${productTypeId}' has no active assets.`,
    );
  }
}

export class BundleCannotBePublishedBecauseAComponentLacksActiveOwnerContractsError extends CatalogError {
  constructor(bundleId: string, productTypeId: string) {
    super(
      `Bundle '${bundleId}' cannot be published because component product type '${productTypeId}' only has external assets without active owner contracts.`,
    );
  }
}
