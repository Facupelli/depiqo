export class AcceptPublicSigningSessionCommand {
  constructor(
    public readonly rawToken: string | null | undefined,
    public readonly signatureImageDataUrl: string | null | undefined,
    public readonly acceptanceTextVersion: string | null | undefined,
    public readonly accepted: boolean | null | undefined,
    public readonly ipAddress: string | null | undefined,
    public readonly userAgent: string | null | undefined,
  ) {}
}
