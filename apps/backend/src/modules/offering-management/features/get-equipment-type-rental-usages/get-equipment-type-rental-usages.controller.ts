import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import {
  GetEquipmentTypeRentalUsagesError,
  GetEquipmentTypeRentalUsagesErrorCode,
} from './get-equipment-type-rental-usages.errors';
import { GetEquipmentTypeRentalUsagesResult } from './get-equipment-type-rental-usages.handler';
import { GetEquipmentTypeRentalUsagesQuery } from './get-equipment-type-rental-usages.query';
import { GetEquipmentTypeRentalUsagesParamsDto } from './get-equipment-type-rental-usages.request.dto';
import type { GetEquipmentTypeRentalUsagesResponseDto } from './get-equipment-type-rental-usages.response.dto';

@Controller('backoffice/equipment-types')
export class GetEquipmentTypeRentalUsagesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':equipmentTypeId/rental-usages')
  async getRentalUsages(
    @Param() params: GetEquipmentTypeRentalUsagesParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeRentalUsagesResponseDto> {
    const result = await this.queryBus.execute<GetEquipmentTypeRentalUsagesQuery, GetEquipmentTypeRentalUsagesResult>(
      new GetEquipmentTypeRentalUsagesQuery(user.tenantId, params.equipmentTypeId),
    );

    if (result.isErr()) throw toGetEquipmentTypeRentalUsagesProblem(result.error);

    return {
      equipmentTypeId: result.value.equipmentTypeId,
      individuals: result.value.individuals.map((usage) => ({
        rentableItemId: usage.rentableItemId,
        name: usage.name,
        imageUrl: usage.imageUrl,
        categoryId: usage.categoryId,
        categoryName: usage.categoryName,
        kind: usage.kind,
        status: usage.status,
        requirementQuantity: usage.requirementQuantity,
        startingPrice: usage.startingPrice
          ? {
              amount: usage.startingPrice.amount,
              currency: usage.startingPrice.currency,
              billingUnit: usage.startingPrice.billingUnit,
            }
          : null,
        offers: usage.offers.map((offer) => ({
          rentalOfferId: offer.rentalOfferId,
          branchId: offer.branchId,
          branchName: offer.branchName,
          isVisible: offer.isVisible,
          isRentable: offer.isRentable,
          pricing: {
            configured: offer.pricing.configured,
            startingPrice: offer.pricing.startingPrice
              ? {
                  amount: offer.pricing.startingPrice.amount,
                  currency: offer.pricing.startingPrice.currency,
                  billingUnit: offer.pricing.startingPrice.billingUnit,
                }
              : null,
          },
        })),
      })),
      combos: result.value.combos.map((usage) => ({
        rentableItemId: usage.rentableItemId,
        name: usage.name,
        imageUrl: usage.imageUrl,
        categoryId: usage.categoryId,
        categoryName: usage.categoryName,
        kind: usage.kind,
        status: usage.status,
        requirementQuantity: usage.requirementQuantity,
      })),
    };
  }
}

function toGetEquipmentTypeRentalUsagesProblem(error: GetEquipmentTypeRentalUsagesError): ProblemException {
  const problem = getEquipmentTypeRentalUsagesProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code, equipmentTypeId: error.context?.equipmentTypeId },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getEquipmentTypeRentalUsagesProblemMap = {
  'offering_management.equipment_type_not_found': {
    type: createProblemType('offering_management.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
} satisfies Record<
  GetEquipmentTypeRentalUsagesErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
