import { Module } from '@nestjs/common';
import { ProductCategoryRepository } from './infrastructure/repositories/product-category.repository';
import { ProductTypeRepository } from './infrastructure/repositories/product-type.repository';
import { CreateProductTypeService } from './application/commands/create-product-type/create-product-type.service';
import { CreateProductCategoryService } from './application/commands/create-product-category/create-product-category.service';
import { GetProductTypeByIdQueryHandler } from './application/queries/get-product-type-by-id/get-product-type-by-id.query-handler';
import { GetProductTypesQueryHandler } from './application/queries/get-product-types/get-product-types.query-handler';
import { GetProductCategoriesQueryHandler } from './application/queries/get-product-categories/get-product-categories.query-handler';
import { GetRentalProductTypesQueryHandler } from './application/queries/get-rental-product-types/get-rental-product-types.query-handler';
import { CatalogPublicApi } from './catalog.public-api';
import { CatalogApplicationService } from './application/catalog.application-service';
import { CreateBundleService } from './application/commands/create-bundle/create-bundle.service';
import { UpdateBundleService } from './application/commands/update-bundle/update-bundle.service';
import { GetBundlesQueryHandler } from './application/queries/get-bundles/get-bundles.query-handler';
import { BundleRepository } from './infrastructure/repositories/bundle.repository';
import { GetBundleByIdQueryHandler } from './application/queries/get-bundle-by-id/get-bundle-by-id.query-handler';
import { GetNewArrivalsQueryHandler } from './application/queries/get-rental-new-arrivals/get-rental-new-arrival.query-handler';
import { GetCombosQueryHandler } from './application/queries/get-rental-bundles/get-rental-bundles.query-handler';
import { PublishProductTypeService } from './application/commands/publish-product-type/publish-product-type.service';
import { RetireProductTypeService } from './application/commands/retire-product-type/retire-product-type.service';
import { PublishBundleService } from './application/commands/publish-bundle/publish-bundle.service';
import { RetireBundleService } from './application/commands/retire-bundle/retire-bundle.service';
import { UpdateProductCategoryService } from './application/commands/update-product-category/update-product-category.service';
import { DeleteProductCategoryService } from './application/commands/delete-product-category/delete-product-category.service';
import { UpdateProductTypeService } from './application/commands/update-product-type/update-product-type.service';
import { CreateProductCategoryHttpController } from './application/commands/create-product-category/create-product-category.http.controller';
import { UpdateProductCategoryHttpController } from './application/commands/update-product-category/update-product-category.http.controller';
import { DeleteProductCategoryHttpController } from './application/commands/delete-product-category/delete-product-category.http.controller';
import { GetProductCategoriesHttpController } from './application/queries/get-product-categories/get-product-categories.http.controller';
import { CreateProductTypeHttpController } from './application/commands/create-product-type/create-product-type.http.controller';
import { UpdateProductTypeHttpController } from './application/commands/update-product-type/update-product-type.http.controller';
import { GetProductTypesHttpController } from './application/queries/get-product-types/get-product-types.http.controller';
import { GetProductTypeByIdHttpController } from './application/queries/get-product-type-by-id/get-product-type-by-id.http.controller';
import { PublishProductTypeHttpController } from './application/commands/publish-product-type/publish-product-type.http.controller';
import { RetireProductTypeHttpController } from './application/commands/retire-product-type/retire-product-type.http.controller';
import { CreateBundleHttpController } from './application/commands/create-bundle/create-bundle.http.controller';
import { UpdateBundleHttpController } from './application/commands/update-bundle/update-bundle.http.controller';
import { GetBundlesHttpController } from './application/queries/get-bundles/get-bundles.http.controller';
import { GetBundleByIdHttpController } from './application/queries/get-bundle-by-id/get-bundle-by-id.http.controller';
import { PublishBundleHttpController } from './application/commands/publish-bundle/publish-bundle.http.controller';
import { RetireBundleHttpController } from './application/commands/retire-bundle/retire-bundle.http.controller';
import { GetRentalProductTypesHttpController } from './application/queries/get-rental-product-types/get-rental-product-types.http.controller';
import { GetRentalBundlesHttpController } from './application/queries/get-rental-bundles/get-rental-bundles.http.controller';
import { GetNewArrivalsHttpController } from './application/queries/get-rental-new-arrivals/get-rental-new-arrival.http.controller';
import { GetRentalCategoriesHttpController } from './application/queries/get-rental-categories/get-rental-categories.http.controller';
import { CatalogPublicationEligibilityService } from './application/services/catalog-publication-eligibility.service';
import { ReplaceProductTypeAccessoryLinksService } from './application/commands/replace-product-type-accessory-links/replace-product-type-accessory-links.service';
import { ReplaceProductTypeAccessoryLinksHttpController } from './application/commands/replace-product-type-accessory-links/replace-product-type-accessory-links.http.controller';
import { GetProductTypeAccessoryLinksQueryHandler } from './application/queries/get-product-type-accessory-links/get-product-type-accessory-links.query-handler';
import { GetProductTypeAccessoryLinksHttpController } from './application/queries/get-product-type-accessory-links/get-product-type-accessory-links.http.controller';
import { GetAvailableAccessoriesQueryHandler } from './application/queries/get-available-accessories/get-available-accessories.query-handler';
import { GetAvailableAccessoriesHttpController } from './application/queries/get-available-accessories/get-available-accessories.http.controller';

const repositories = [ProductCategoryRepository, ProductTypeRepository, BundleRepository];

const commandhandlers = [
  CreateProductTypeService,
  CreateProductCategoryService,
  CreateBundleService,
  UpdateProductCategoryService,
  DeleteProductCategoryService,
  UpdateProductTypeService,
  UpdateBundleService,
  PublishProductTypeService,
  RetireProductTypeService,
  PublishBundleService,
  RetireBundleService,
  ReplaceProductTypeAccessoryLinksService,
];

const queryHandlers = [
  GetProductTypeByIdQueryHandler,
  GetProductTypesQueryHandler,
  GetProductCategoriesQueryHandler,
  GetBundlesQueryHandler,
  GetBundleByIdQueryHandler,
  GetProductTypeAccessoryLinksQueryHandler,
  GetAvailableAccessoriesQueryHandler,
];

const rentalQueryHandlers = [GetRentalProductTypesQueryHandler, GetNewArrivalsQueryHandler, GetCombosQueryHandler];

@Module({
  controllers: [
    CreateProductCategoryHttpController,
    UpdateProductCategoryHttpController,
    DeleteProductCategoryHttpController,
    GetProductCategoriesHttpController,
    CreateProductTypeHttpController,
    UpdateProductTypeHttpController,
    GetProductTypesHttpController,
    GetProductTypeByIdHttpController,
    PublishProductTypeHttpController,
    RetireProductTypeHttpController,
    CreateBundleHttpController,
    UpdateBundleHttpController,
    GetBundlesHttpController,
    GetBundleByIdHttpController,
    PublishBundleHttpController,
    RetireBundleHttpController,
    GetRentalProductTypesHttpController,
    GetRentalBundlesHttpController,
    GetNewArrivalsHttpController,
    GetRentalCategoriesHttpController,
    ReplaceProductTypeAccessoryLinksHttpController,
    GetProductTypeAccessoryLinksHttpController,
    GetAvailableAccessoriesHttpController,
  ],
  providers: [
    ...repositories,
    ...commandhandlers,
    ...queryHandlers,
    ...rentalQueryHandlers,
    CatalogPublicationEligibilityService,
    CatalogApplicationService,
    { provide: CatalogPublicApi, useClass: CatalogApplicationService },
  ],
  exports: [CatalogPublicApi],
})
export class CatalogModule {}
