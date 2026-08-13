import { Injectable } from '@nestjs/common';
import { Result } from 'neverthrow';

import { ResolveSelectedRentalOffersService } from '../features/resolve-selected-rental-offers/resolve-selected-rental-offers.service';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
  ResolveSelectedRentalOffersInput,
  ResolveSelectedRentalOffersResult,
} from './catalog-selection-resolution.public-api';

@Injectable()
export class CatalogSelectionResolutionService extends CatalogSelectionResolution {
  constructor(private readonly resolveSelectedRentalOffersService: ResolveSelectedRentalOffersService) {
    super();
  }

  async resolveSelectedRentalOffers(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, CatalogSelectionResolutionError>> {
    return this.resolveSelectedRentalOffersService.execute(input);
  }
}
