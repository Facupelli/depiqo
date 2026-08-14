export interface ApplicationError {
  code: string;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export type ApplicationErrorCode = ApplicationError['code'];
