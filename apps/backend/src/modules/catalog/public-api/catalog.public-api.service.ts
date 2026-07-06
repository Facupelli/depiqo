import { Injectable } from '@nestjs/common';
import { Result } from 'neverthrow';

import { RentalCommitmentError } from '../../rental-commitment/domain/errors/rental-commitment.errors';
import { CreateRentalOfferForRentableItemCommand } from '../features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.command';
import { CreateRentalOfferForRentableItemService } from '../features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.service';
import { CreateRentableItemOfferingCommand } from '../features/create-rentable-item-offering/create-rentable-item-offering.command';
import { CreateRentableItemOfferingService } from '../features/create-rentable-item-offering/create-rentable-item-offering.service';
import { ResolveSelectedRentalOffersService } from '../features/resolve-selected-rental-offers/resolve-selected-rental-offers.service';
import { CatalogError } from '../domain/errors/catalog.errors';
import {
  CatalogPublicApi,
  CreateRentalOfferForRentableItemInput,
  CreateRentalOfferForRentableItemResult,
  CreateRentableItemOfferingInput,
  CreateRentableItemOfferingResult,
  ResolveSelectedRentalOffersInput,
  ResolveSelectedRentalOffersResult,
} from './catalog.public-api';

@Injectable()
export class CatalogPublicApiService extends CatalogPublicApi {
  constructor(
    private readonly createRentableItemOfferingService: CreateRentableItemOfferingService,
    private readonly createRentalOfferForRentableItemService: CreateRentalOfferForRentableItemService,
    private readonly resolveSelectedRentalOffersService: ResolveSelectedRentalOffersService,
  ) {
    super();
  }

  async createRentableItemOffering(
    input: CreateRentableItemOfferingInput,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogError>> {
    return this.createRentableItemOfferingService.execute(
      new CreateRentableItemOfferingCommand(input.tenantId, {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        categoryId: input.categoryId,
        kind: input.kind,
        requirements: input.requirements,
        branchIds: input.branchIds,
      }),
    );
  }

  async createRentalOfferForRentableItem(
    input: CreateRentalOfferForRentableItemInput,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogError>> {
    return this.createRentalOfferForRentableItemService.execute(new CreateRentalOfferForRentableItemCommand(input));
  }

  async resolveSelectedRentalOffers(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, RentalCommitmentError>> {
    return this.resolveSelectedRentalOffersService.execute(input);
  }
}
