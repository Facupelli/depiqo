import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2ProblemException } from 'src/core/problem-details/v2';

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
    type: createV2ProblemType('pricing/promotion-not-found'),
    title: 'Promotion not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested promotion was not found.',
  },
};

export function toGetPromotionDetailProblem(error: GetPromotionDetailApplicationError): V2ProblemException {
  const definition = GetPromotionDetailProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
