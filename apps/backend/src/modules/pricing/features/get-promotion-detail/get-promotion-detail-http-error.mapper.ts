import { HttpStatus } from '@nestjs/common';

import { createProblemType, ProblemException } from 'src/core/problem-details';

import {
  GetPromotionDetailApplicationError,
  GetPromotionDetailApplicationErrorCode,
} from './get-promotion-detail-application.error';

interface GetPromotionDetailProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetPromotionDetailProblemCatalog: Record<
  GetPromotionDetailApplicationErrorCode,
  GetPromotionDetailProblemDefinition
> = {
  PromotionNotFound: {
    type: createProblemType('pricing/promotion-not-found'),
    title: 'Promotion not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested promotion was not found.',
  },
};

export function toGetPromotionDetailProblem(error: GetPromotionDetailApplicationError): ProblemException {
  const definition = GetPromotionDetailProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
