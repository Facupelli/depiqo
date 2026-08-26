export type PublicRentalRemitoSigningErrorCode =
  | 'SigningTokenNotFound'
  | 'SigningRequestExpired'
  | 'SigningRequestUnavailable'
  | 'ReceiptTokenNotFound'
  | 'ReceiptTokenExpired'
  | 'ReceiptTokenUnavailable'
  | 'AcceptanceConfirmationRequired';

export interface PublicRentalRemitoSigningError {
  code: PublicRentalRemitoSigningErrorCode;
  message: string;
}
