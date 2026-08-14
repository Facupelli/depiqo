export interface CustomHostname {
  id: string;
  hostname: string;
  status: string | null;
  sslStatus: string | null;
  validationErrors: string[];
  ownershipVerificationErrors: string[];
}

export abstract class CustomHostnameProvider {
  abstract createCustomHostname(hostname: string): Promise<CustomHostname>;
  abstract getCustomHostname(providerHostnameId: string): Promise<CustomHostname>;
}
