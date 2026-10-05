import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetBackofficeCustomerProfileErrorCode = 'tenant_management.rental_customer_not_found';

export interface GetBackofficeCustomerProfileError extends ApplicationError {
  code: GetBackofficeCustomerProfileErrorCode;
}

export function getBackofficeCustomerProfileError(
  customerId: string,
  tenantId: string,
): GetBackofficeCustomerProfileError {
  return {
    code: 'tenant_management.rental_customer_not_found',
    message: `Rental customer "${customerId}" was not found.`,
    context: { useCase: 'GetBackofficeCustomerProfile', customerId, tenantId } satisfies ApplicationErrorContext,
  };
}
