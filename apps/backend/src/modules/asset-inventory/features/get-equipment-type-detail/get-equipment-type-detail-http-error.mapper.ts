import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  GetEquipmentTypeDetailApplicationError,
  GetEquipmentTypeDetailApplicationErrorCode,
} from './get-equipment-type-detail-application.error';

interface GetEquipmentTypeDetailProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetEquipmentTypeDetailProblemCatalog: Record<
  GetEquipmentTypeDetailApplicationErrorCode,
  GetEquipmentTypeDetailProblemDefinition
> = {
  EquipmentTypeNotFound: {
    type: createProblemType('asset-inventory/equipment-type-not-found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetEquipmentTypeDetailProblem(error: GetEquipmentTypeDetailApplicationError): ProblemException {
  const definition = GetEquipmentTypeDetailProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
