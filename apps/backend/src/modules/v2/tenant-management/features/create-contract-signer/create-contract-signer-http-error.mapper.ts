import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  CreateContractSignerApplicationError,
  CreateContractSignerApplicationErrorCode,
} from './create-contract-signer-application.error';

interface CreateContractSignerProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CreateContractSignerProblemCatalog: Record<
  CreateContractSignerApplicationErrorCode,
  CreateContractSignerProblemDefinition
> = {
  ContractSignerAlreadyExists: {
    type: createV2ProblemType('tenant-management/contract-signer-already-exists'),
    title: 'Contract signer already exists',
    status: HttpStatus.CONFLICT,
    detail: 'The current tenant already has an active contract signer.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateContractSignerProblem(error: CreateContractSignerApplicationError): V2ProblemException {
  const definition = CreateContractSignerProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
