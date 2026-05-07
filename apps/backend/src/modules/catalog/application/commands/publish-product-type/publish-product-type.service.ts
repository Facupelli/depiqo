import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RentalItemKind } from '@repo/types';
import { Result, err, ok } from 'neverthrow';
import { PublishProductTypeCommand } from './publish-product-type.command';
import {
  AccessoryProductTypeCannotBePublishedError,
  ProductTypeAlreadyPublishedError,
  ProductTypeAlreadyRetiredError,
  ProductTypeCannotBePublishedWithoutActiveOwnerContractsError,
  ProductTypeCannotBePublishedWithoutAssetsError,
  ProductTypeCannotBePublishedWithoutPricingTiersError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';
import { ProductTypeRepository } from 'src/modules/catalog/infrastructure/repositories/product-type.repository';
import { CatalogPublicationEligibilityService } from '../../services/catalog-publication-eligibility.service';

type PublishProductTypeResult = Result<
  void,
  | ProductTypeNotFoundError
  | ProductTypeAlreadyPublishedError
  | ProductTypeAlreadyRetiredError
  | ProductTypeCannotBePublishedWithoutAssetsError
  | ProductTypeCannotBePublishedWithoutActiveOwnerContractsError
  | AccessoryProductTypeCannotBePublishedError
  | ProductTypeCannotBePublishedWithoutPricingTiersError
>;

@Injectable()
@CommandHandler(PublishProductTypeCommand)
export class PublishProductTypeService implements ICommandHandler<PublishProductTypeCommand, PublishProductTypeResult> {
  constructor(
    private readonly productTypeRepo: ProductTypeRepository,
    private readonly publicationEligibility: CatalogPublicationEligibilityService,
  ) {}

  async execute(command: PublishProductTypeCommand): Promise<PublishProductTypeResult> {
    const productType = await this.productTypeRepo.load(command.productTypeId, command.tenantId);
    if (!productType) {
      return err(new ProductTypeNotFoundError(command.productTypeId));
    }

    if (productType.currentKind === RentalItemKind.ACCESSORY) {
      return err(new AccessoryProductTypeCannotBePublishedError(command.productTypeId));
    }

    const eligibilityResult = await this.publicationEligibility.ensureProductTypeCanBePublished(
      command.tenantId,
      command.productTypeId,
    );
    if (eligibilityResult.isErr()) {
      return err(eligibilityResult.error);
    }

    const publishResult = productType.publish();
    if (publishResult.isErr()) {
      return err(publishResult.error);
    }

    await this.productTypeRepo.save(productType);

    return ok(undefined);
  }
}
