import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { UpdateProductTypeCommand } from './update-product-type.command';
import { ProductTypeRepository } from 'src/modules/catalog/infrastructure/repositories/product-type.repository';
import {
  AccessoryProductTypeCannotBePublishedError,
  InvalidProductTypeNameError,
  ProductTypeAlreadyRetiredError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

type UpdateProductTypeResult = Result<
  void,
  | ProductTypeNotFoundError
  | InvalidProductTypeNameError
  | ProductTypeAlreadyRetiredError
  | AccessoryProductTypeCannotBePublishedError
>;

@CommandHandler(UpdateProductTypeCommand)
export class UpdateProductTypeService implements ICommandHandler<UpdateProductTypeCommand, UpdateProductTypeResult> {
  constructor(private readonly productTypeRepository: ProductTypeRepository) {}

  async execute(command: UpdateProductTypeCommand): Promise<UpdateProductTypeResult> {
    const productType = await this.productTypeRepository.load(command.productTypeId, command.tenantId);
    if (!productType) {
      return err(new ProductTypeNotFoundError(command.productTypeId));
    }

    const updateResult = productType.update(command.patch);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    await this.productTypeRepository.save(productType);

    return ok(undefined);
  }
}
