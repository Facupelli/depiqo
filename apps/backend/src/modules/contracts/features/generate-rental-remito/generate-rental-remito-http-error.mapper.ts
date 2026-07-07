import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  RentalRemitoApplicationError,
  RentalRemitoApplicationErrorCode,
} from '../../application/rental-remito/rental-remito-application.error';

interface GenerateRentalRemitoProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GenerateRentalRemitoProblemCatalog: Record<
  RentalRemitoApplicationErrorCode,
  GenerateRentalRemitoProblemDefinition
> = {
  ContractAlreadySigned: {
    type: createProblemType('contracts/rental-remito-contract-already-signed'),
    title: 'Contract already signed',
    status: HttpStatus.CONFLICT,
    detail: 'The contract is already signed and cannot be regenerated for signing.',
  },
  RentalNotFound: {
    type: createProblemType('contracts/rental-remito-rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental was not found.',
  },
  RentalNotReady: {
    type: createProblemType('contracts/rental-remito-rental-not-ready'),
    title: 'Rental not ready',
    status: HttpStatus.CONFLICT,
    detail: 'The rental must be confirmed before generating the remito.',
  },
  CustomerProfileMissing: {
    type: createProblemType('contracts/rental-remito-customer-profile-missing'),
    title: 'Customer profile missing',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile does not have enough legal identity data to generate the remito.',
  },
  CustomerEmailMissing: {
    type: createProblemType('contracts/rental-remito-customer-email-missing'),
    title: 'Customer email missing',
    status: HttpStatus.CONFLICT,
    detail: 'The customer email is required to prepare the remito for signing.',
  },
  TenantSignerMissing: {
    type: createProblemType('contracts/rental-remito-tenant-signer-missing'),
    title: 'Tenant signer missing',
    status: HttpStatus.CONFLICT,
    detail: 'The tenant does not have an active contract signer configured.',
  },
  BranchContextMissing: {
    type: createProblemType('contracts/rental-remito-branch-context-missing'),
    title: 'Branch context missing',
    status: HttpStatus.CONFLICT,
    detail: 'The rental branch does not have enough context to generate the remito.',
  },
  PriceSnapshotInvalid: {
    type: createProblemType('contracts/rental-remito-price-snapshot-invalid'),
    title: 'Price snapshot invalid',
    status: HttpStatus.CONFLICT,
    detail: 'The rental does not have a valid confirmed price snapshot.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGenerateRentalRemitoProblem(error: RentalRemitoApplicationError): ProblemException {
  const definition = GenerateRentalRemitoProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
