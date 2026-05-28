import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  UpdateContractSignerApplicationError,
  UpdateContractSignerApplicationErrorCode,
} from './update-contract-signer-application.error';

interface UpdateContractSignerProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const UpdateContractSignerProblemCatalog: Record<
  UpdateContractSignerApplicationErrorCode,
  UpdateContractSignerProblemDefinition
> = {
  ContractSignerNotFound: {
    type: createV2ProblemType('tenant-management/contract-signer-not-found'),
    title: 'Contract signer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant does not have an active contract signer.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toUpdateContractSignerProblem(error: UpdateContractSignerApplicationError): V2ProblemException {
  const definition = UpdateContractSignerProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
