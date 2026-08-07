export class AcceptPublicSigningSessionCommand {
  constructor(
    public readonly rawToken: string,
    public readonly signatureImageDataUrl: string,
    public readonly acceptanceTextVersion: string,
    public readonly accepted: boolean,
    public readonly acceptedIpAddress: string | null,
    public readonly acceptedUserAgent: string | null,
  ) {}
}
