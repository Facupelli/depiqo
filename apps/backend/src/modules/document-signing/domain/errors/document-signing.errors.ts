import { DomainError } from 'src/core/exceptions/domain.error';

export class DocumentSigningError extends DomainError {}

export class DocumentSigningRequestStatusTransitionNotAllowedError extends DocumentSigningError {
  constructor(requestId: string, from: string, to: string) {
    super(`Document signing request '${requestId}' cannot transition from '${from}' to '${to}'.`);
  }
}

export class SigningInvitationRecipientEmailRequiredError extends DocumentSigningError {
  constructor(orderId: string) {
    super(`Order '${orderId}' must provide a recipient email before a signing invitation can be sent.`);
  }
}

export class SigningInvitationOrderNotFoundError extends DocumentSigningError {
  constructor(orderId: string) {
    super(`Order "${orderId}" was not found.`);
  }
}

export class SigningInvitationOrderNotReadyError extends DocumentSigningError {
  constructor(message: string) {
    super(message);
  }
}

export class SigningInvitationCustomerProfileMissingError extends DocumentSigningError {
  constructor(message: string) {
    super(message);
  }
}

export class SigningInvitationEmailDeliveryFailedError extends DocumentSigningError {
  constructor(message: string) {
    super(message);
  }
}

export class DocumentSigningRequestTokenNotFoundError extends DocumentSigningError {
  constructor() {
    super('Document signing request was not found for the provided token.');
  }
}

export class DocumentSigningRequestExpiredError extends DocumentSigningError {
  constructor(requestId: string) {
    super(`Document signing request '${requestId}' has expired.`);
  }
}

export class DocumentSigningRequestUnavailableError extends DocumentSigningError {
  constructor(requestId: string, status: string) {
    super(`Document signing request '${requestId}' is not available for public signing because it is '${status}'.`);
  }
}

export class SigningAcceptanceConfirmationRequiredError extends DocumentSigningError {
  constructor() {
    super('Signing acceptance requires explicit confirmation from the signer.');
  }
}

export class SigningAcceptanceIdentityRequiredError extends DocumentSigningError {
  constructor(field: 'signatureImageDataUrl' | 'acceptanceTextVersion') {
    super(`Signing acceptance requires a non-empty '${field}'.`);
  }
}
