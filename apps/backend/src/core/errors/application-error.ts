import type { JsonObject } from 'src/core/types/json-value';

export type ApplicationErrorContext = JsonObject;

export interface ApplicationError {
  code: string;
  message: string;
  cause?: unknown;
  context?: ApplicationErrorContext;
}

export type ApplicationErrorCode = ApplicationError['code'];
