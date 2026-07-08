import { randomUUID } from 'crypto';

import { err, ok, Result } from 'neverthrow';
import { DomainException } from 'src/core/exceptions/domain.exception';
import { DocumentSigningRequestStatus, SigningDocumentType } from 'src/generated/prisma/client';

import {
  DocumentSigningRequestStatusTransitionNotAllowedError,
  SigningAcceptanceIdentityRequiredError,
} from '../errors/document-signing.errors';

const ALLOWED_TRANSITIONS: Record<DocumentSigningRequestStatus, DocumentSigningRequestStatus[]> = {
  [DocumentSigningRequestStatus.PENDING]: [
    DocumentSigningRequestStatus.SIGNED,
    DocumentSigningRequestStatus.EXPIRED,
    DocumentSigningRequestStatus.VOIDED,
  ],
  [DocumentSigningRequestStatus.SIGNED]: [],
  [DocumentSigningRequestStatus.EXPIRED]: [],
  [DocumentSigningRequestStatus.VOIDED]: [],
};

export interface CreateDocumentSigningRequestProps {
  id?: string;
  tenantId: string;
  orderId: string;
  customerId?: string | null;
  documentType: SigningDocumentType;
  documentNumber: string;
  recipientEmail: string;
  tokenHash: string;
  documentHash: string;
  pdfStorageKey: string;
  pdfFileName: string;
  pdfContentType: string;
  pdfByteSize: number;
  expiresAt: Date;
}

export interface ReconstituteDocumentSigningRequestProps extends CreateDocumentSigningRequestProps {
  id: string;
  status: DocumentSigningRequestStatus;
  signedAt: Date | null;
  signerFullName: string | null;
  signerDocumentNumber: string | null;
  signatureImageDataUrl: string | null;
  acceptanceTextVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentSigningRequest {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly customerId: string | null,
    public readonly documentType: SigningDocumentType,
    public readonly documentNumber: string,
    private recipientEmail: string,
    private tokenHash: string,
    public readonly documentHash: string,
    public readonly pdfStorageKey: string,
    public readonly pdfFileName: string,
    public readonly pdfContentType: string,
    public readonly pdfByteSize: number,
    private status: DocumentSigningRequestStatus,
    private expiresAt: Date,
    private signedAt: Date | null,
    private signerFullName: string | null,
    private signerDocumentNumber: string | null,
    private signatureImageDataUrl: string | null,
    private acceptanceTextVersion: string | null,
    public readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static createPending(props: CreateDocumentSigningRequestProps): DocumentSigningRequest {
    const now = new Date();

    return DocumentSigningRequest.reconstitute({
      id: props.id ?? randomUUID(),
      tenantId: props.tenantId,
      orderId: props.orderId,
      customerId: props.customerId ?? null,
      documentType: props.documentType,
      documentNumber: props.documentNumber,
      recipientEmail: props.recipientEmail,
      tokenHash: props.tokenHash,
      documentHash: props.documentHash,
      pdfStorageKey: props.pdfStorageKey,
      pdfFileName: props.pdfFileName,
      pdfContentType: props.pdfContentType,
      pdfByteSize: props.pdfByteSize,
      status: DocumentSigningRequestStatus.PENDING,
      expiresAt: props.expiresAt,
      signedAt: null,
      signerFullName: null,
      signerDocumentNumber: null,
      signatureImageDataUrl: null,
      acceptanceTextVersion: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ReconstituteDocumentSigningRequestProps): DocumentSigningRequest {
    return new DocumentSigningRequest(
      props.id,
      DocumentSigningRequest.assertNonEmpty('tenantId', props.tenantId),
      DocumentSigningRequest.assertNonEmpty('orderId', props.orderId),
      props.customerId ?? null,
      props.documentType,
      DocumentSigningRequest.assertNonEmpty('documentNumber', props.documentNumber),
      DocumentSigningRequest.assertNonEmpty('recipientEmail', props.recipientEmail),
      DocumentSigningRequest.assertNonEmpty('tokenHash', props.tokenHash),
      DocumentSigningRequest.assertNonEmpty('documentHash', props.documentHash),
      DocumentSigningRequest.assertNonEmpty('pdfStorageKey', props.pdfStorageKey),
      DocumentSigningRequest.assertNonEmpty('pdfFileName', props.pdfFileName),
      DocumentSigningRequest.assertNonEmpty('pdfContentType', props.pdfContentType),
      DocumentSigningRequest.assertPositiveInteger('pdfByteSize', props.pdfByteSize),
      props.status,
      props.expiresAt,
      props.signedAt,
      props.signerFullName?.trim() || null,
      props.signerDocumentNumber?.trim() || null,
      props.signatureImageDataUrl?.trim() || null,
      props.acceptanceTextVersion?.trim() || null,
      props.createdAt,
      props.updatedAt,
    );
  }

  get currentRecipientEmail(): string {
    return this.recipientEmail;
  }

  get currentTokenHash(): string {
    return this.tokenHash;
  }

  get currentStatus(): DocumentSigningRequestStatus {
    return this.status;
  }

  get expiresOn(): Date {
    return this.expiresAt;
  }

  get currentPdfStorageKey(): string {
    return this.pdfStorageKey;
  }

  get currentPdfFileName(): string {
    return this.pdfFileName;
  }

  get currentPdfContentType(): string {
    return this.pdfContentType;
  }

  get currentPdfByteSize(): number {
    return this.pdfByteSize;
  }

  get signedOn(): Date | null {
    return this.signedAt;
  }

  get currentSignerFullName(): string | null {
    return this.signerFullName;
  }

  get currentSignerDocumentNumber(): string | null {
    return this.signerDocumentNumber;
  }

  get currentSignatureImageDataUrl(): string | null {
    return this.signatureImageDataUrl;
  }

  get currentAcceptanceTextVersion(): string | null {
    return this.acceptanceTextVersion;
  }

  get updatedOn(): Date {
    return this.updatedAt;
  }

  refreshPendingInvitation(
    props: { recipientEmail: string; tokenHash: string; expiresAt: Date },
    at = new Date(),
  ): Result<void, DocumentSigningRequestStatusTransitionNotAllowedError> {
    if (this.status !== DocumentSigningRequestStatus.PENDING) {
      return err(
        new DocumentSigningRequestStatusTransitionNotAllowedError(
          this.id,
          this.status,
          DocumentSigningRequestStatus.PENDING,
        ),
      );
    }

    this.recipientEmail = DocumentSigningRequest.assertNonEmpty('recipientEmail', props.recipientEmail);
    this.tokenHash = DocumentSigningRequest.assertNonEmpty('tokenHash', props.tokenHash);
    this.expiresAt = props.expiresAt;
    this.touch(at);
    return ok(undefined);
  }

  markSigned(props: {
    signedAt: Date;
    signatureImageDataUrl: string;
    acceptanceTextVersion: string;
  }): Result<void, DocumentSigningRequestStatusTransitionNotAllowedError | SigningAcceptanceIdentityRequiredError> {
    const signatureImageDataUrl = this.normalizeRequiredString('signatureImageDataUrl', props.signatureImageDataUrl);
    if (signatureImageDataUrl.isErr()) {
      return err(signatureImageDataUrl.error);
    }

    const acceptanceTextVersion = this.normalizeRequiredString(
      'acceptanceTextVersion',
      props.acceptanceTextVersion,
    );
    if (acceptanceTextVersion.isErr()) {
      return err(acceptanceTextVersion.error);
    }

    const transition = this.transitionTo(DocumentSigningRequestStatus.SIGNED);
    if (transition.isErr()) {
      return transition;
    }

    this.signedAt = props.signedAt;
    this.signatureImageDataUrl = signatureImageDataUrl.value;
    this.acceptanceTextVersion = acceptanceTextVersion.value;
    this.touch(props.signedAt);
    return ok(undefined);
  }

  expire(at: Date): Result<void, DocumentSigningRequestStatusTransitionNotAllowedError> {
    const transition = this.transitionTo(DocumentSigningRequestStatus.EXPIRED);
    if (transition.isErr()) {
      return transition;
    }

    this.touch(at);
    return ok(undefined);
  }

  void(at: Date): Result<void, DocumentSigningRequestStatusTransitionNotAllowedError> {
    const transition = this.transitionTo(DocumentSigningRequestStatus.VOIDED);
    if (transition.isErr()) {
      return transition;
    }

    this.touch(at);
    return ok(undefined);
  }

  private transitionTo(
    next: DocumentSigningRequestStatus,
  ): Result<void, DocumentSigningRequestStatusTransitionNotAllowedError> {
    const allowed = ALLOWED_TRANSITIONS[this.status];

    if (!allowed.includes(next)) {
      return err(new DocumentSigningRequestStatusTransitionNotAllowedError(this.id, this.status, next));
    }

    this.status = next;
    return ok(undefined);
  }

  private touch(at = new Date()): void {
    this.updatedAt = at;
  }

  private normalizeRequiredString(
    field: 'signatureImageDataUrl' | 'acceptanceTextVersion',
    value: string,
  ): Result<string, SigningAcceptanceIdentityRequiredError> {
    const normalized = value.trim();

    if (normalized.length === 0) {
      return err(new SigningAcceptanceIdentityRequiredError(field));
    }

    return ok(normalized);
  }

  private static assertNonEmpty(name: string, value: string): string {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new DomainException(`DocumentSigningRequest ${name} cannot be empty.`);
    }

    return normalized;
  }

  private static assertPositiveInteger(name: string, value: number): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new DomainException(`DocumentSigningRequest ${name} must be a positive integer.`);
    }

    return value;
  }
}
