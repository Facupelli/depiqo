export abstract class V2DocumentSigningError extends Error {
  abstract readonly code: string;
}

export class SigningInvitationCustomerProfileMissingError extends V2DocumentSigningError {
  readonly code = 'SigningInvitationCustomerProfileMissing';

  constructor(message = 'Customer profile is required to send a signing invitation.') {
    super(message);
  }
}

export class SigningInvitationOrderNotFoundError extends V2DocumentSigningError {
  readonly code = 'SigningInvitationOrderNotFound';

  constructor(orderId: string) {
    super(`Order "${orderId}" was not found.`);
  }
}

export class SigningInvitationOrderNotReadyError extends V2DocumentSigningError {
  readonly code = 'SigningInvitationOrderNotReady';

  constructor(message = 'The order is not ready for signing.') {
    super(message);
  }
}

export class SigningInvitationRecipientEmailRequiredError extends V2DocumentSigningError {
  readonly code = 'SigningInvitationRecipientEmailRequired';

  constructor(orderId: string) {
    super(`A recipient email is required to send a signing invitation for order "${orderId}".`);
  }
}

export class SigningInvitationEmailDeliveryFailedError extends V2DocumentSigningError {
  readonly code = 'SigningInvitationEmailDeliveryFailed';

  constructor(message = 'Signing invitation email delivery failed.') {
    super(message);
  }
}

export class PublicSigningTokenRequiredError extends V2DocumentSigningError {
  readonly code = 'PublicSigningTokenRequired';

  constructor() {
    super('A signing token is required.');
  }
}

export class PublicSigningRequestNotFoundError extends V2DocumentSigningError {
  readonly code = 'PublicSigningRequestNotFound';

  constructor() {
    super('The signing session was not found.');
  }
}

export class PublicSigningRequestExpiredError extends V2DocumentSigningError {
  readonly code = 'PublicSigningRequestExpired';

  constructor() {
    super('The signing session has expired.');
  }
}

export class PublicSigningRequestUnavailableError extends V2DocumentSigningError {
  readonly code = 'PublicSigningRequestUnavailable';

  constructor() {
    super('The signing session is not available.');
  }
}

export class PublicSigningUnsignedArtifactMissingError extends V2DocumentSigningError {
  readonly code = 'PublicSigningUnsignedArtifactMissing';

  constructor() {
    super('The unsigned signing document was not found.');
  }
}

export class SigningAcceptanceConfirmationRequiredError extends V2DocumentSigningError {
  readonly code = 'SigningAcceptanceConfirmationRequired';

  constructor() {
    super('The signer must explicitly accept the document before signing.');
  }
}

export class SigningAcceptanceSignatureRequiredError extends V2DocumentSigningError {
  readonly code = 'SigningAcceptanceSignatureRequired';

  constructor() {
    super('A signature image is required.');
  }
}

export class SigningAcceptanceTextVersionRequiredError extends V2DocumentSigningError {
  readonly code = 'SigningAcceptanceTextVersionRequired';

  constructor() {
    super('An acceptance text version is required.');
  }
}

export class SigningAcceptanceTextVersionInvalidError extends V2DocumentSigningError {
  readonly code = 'SigningAcceptanceTextVersionInvalid';

  constructor(version: string) {
    super(`Acceptance text version "${version}" is not valid.`);
  }
}

export class SigningAcceptanceAlreadyCompletedError extends V2DocumentSigningError {
  readonly code = 'SigningAcceptanceAlreadyCompleted';

  constructor() {
    super('The signing session has already been completed.');
  }
}

export class SigningAcceptanceRenderFailedError extends V2DocumentSigningError {
  readonly code = 'SigningAcceptanceRenderFailed';

  constructor(message = 'The signed document could not be rendered.') {
    super(message);
  }
}

export class PublicSigningUnsignedArtifactHashMissingError extends V2DocumentSigningError {
  readonly code = 'PublicSigningUnsignedArtifactHashMissing';

  constructor() {
    super('The unsigned signing document is missing its hash proof.');
  }
}

export class PublicReceiptTokenRequiredError extends V2DocumentSigningError {
  readonly code = 'PublicReceiptTokenRequired';

  constructor() {
    super('A receipt token is required.');
  }
}

export class PublicReceiptNotFoundError extends V2DocumentSigningError {
  readonly code = 'PublicReceiptNotFound';

  constructor() {
    super('The signed document receipt was not found.');
  }
}

export class PublicReceiptExpiredError extends V2DocumentSigningError {
  readonly code = 'PublicReceiptExpired';

  constructor() {
    super('The signed document receipt has expired.');
  }
}

export class PublicReceiptSignedArtifactMissingError extends V2DocumentSigningError {
  readonly code = 'PublicReceiptSignedArtifactMissing';

  constructor() {
    super('The signed document artifact was not found.');
  }
}
