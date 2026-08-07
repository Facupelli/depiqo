export const RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION = 'rental-remito-v1';

const acceptanceTexts = {
  [RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION]:
    'He leído y revisado este documento, acepto su contenido y confirmo mi intención de firmarlo electrónicamente.',
} as const;

export interface RentalRemitoAcceptanceText {
  version: string;
  text: string;
}

export function getRentalRemitoAcceptanceText(version: string): RentalRemitoAcceptanceText | null {
  const text = acceptanceTexts[version as keyof typeof acceptanceTexts];

  return text ? { version, text } : null;
}
