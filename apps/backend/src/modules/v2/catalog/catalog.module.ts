import { Module } from '@nestjs/common';

import { ActivateRentableItemHttpController } from './features/activate-rentable-item/activate-rentable-item.controller';
import { ActivateRentableItemHandler } from './features/activate-rentable-item/activate-rentable-item.handler';
import { CreateCategoryHttpController } from './features/create-category/create-category.controller';
import { CreateCategoryHandler } from './features/create-category/create-category.handler';
import { CreateRentalOfferForRentableItemService } from './features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.service';
import { CreateRentableItemOfferingService } from './features/create-rentable-item-offering/create-rentable-item-offering.service';
import { GetCategoriesHttpController } from './features/get-categories/get-categories.controller';
import { GetCategoriesHandler } from './features/get-categories/get-categories.handler';
import { GetRentableItemDetailHttpController } from './features/get-rentable-item-detail/get-rentable-item-detail.controller';
import { GetRentableItemDetailHandler } from './features/get-rentable-item-detail/get-rentable-item-detail.handler';
import { GetRentableItemsHttpController } from './features/get-rentable-items/get-rentable-items.controller';
import { GetRentableItemsHandler } from './features/get-rentable-items/get-rentable-items.handler';
import { GetStorefrontCategoriesHttpController } from './features/get-storefront-categories/get-storefront-categories.controller';
import { GetStorefrontCategoriesHandler } from './features/get-storefront-categories/get-storefront-categories.handler';
import { GetStorefrontRentalOffersHttpController } from './features/get-storefront-rental-offers/get-storefront-rental-offers.controller';
import { GetStorefrontRentalOffersHandler } from './features/get-storefront-rental-offers/get-storefront-rental-offers.handler';
import { SearchRentalOffersHttpController } from './features/search-rental-offers/search-rental-offers.controller';
import { SearchRentalOffersHandler } from './features/search-rental-offers/search-rental-offers.handler';
import { PrismaRentableItemRepository } from './features/create-rentable-item-offering/prisma-rentable-item.repository';
import { PrismaRentalOfferRepository } from './features/create-rentable-item-offering/prisma-rental-offer.repository';
import { PrismaResolveSelectedRentalOffersReader } from './features/resolve-selected-rental-offers/prisma-resolve-selected-rental-offers.reader';
import { ResolveSelectedRentalOffersService } from './features/resolve-selected-rental-offers/resolve-selected-rental-offers.service';
import { CatalogPublicApi } from './public-api/catalog.public-api';
import { CatalogPublicApiService } from './public-api/catalog.public-api.service';

@Module({
  controllers: [
    ActivateRentableItemHttpController,
    CreateCategoryHttpController,
    GetCategoriesHttpController,
    GetRentableItemDetailHttpController,
    GetRentableItemsHttpController,
    GetStorefrontCategoriesHttpController,
    GetStorefrontRentalOffersHttpController,
    SearchRentalOffersHttpController,
  ],
  providers: [
    { provide: CatalogPublicApi, useClass: CatalogPublicApiService },
    ActivateRentableItemHandler,
    CreateCategoryHandler,
    CreateRentalOfferForRentableItemService,
    CreateRentableItemOfferingService,
    GetCategoriesHandler,
    GetRentableItemDetailHandler,
    GetRentableItemsHandler,
    GetStorefrontCategoriesHandler,
    GetStorefrontRentalOffersHandler,
    SearchRentalOffersHandler,
    PrismaRentableItemRepository,
    PrismaRentalOfferRepository,
    ResolveSelectedRentalOffersService,
    PrismaResolveSelectedRentalOffersReader,
  ],
  exports: [CatalogPublicApi],
})
export class V2CatalogModule {}
