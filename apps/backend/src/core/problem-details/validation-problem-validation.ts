import { HttpException } from '@nestjs/common';

import { InvalidParam } from './problem-details';

interface ValidationResponse {
  'invalid-params'?: unknown;
  errors?: unknown;
  message?: unknown;
}

interface ValidationError {
  constraints?: unknown;
  path?: unknown;
  property?: unknown;
  field?: unknown;
  name?: unknown;
  message?: unknown;
  reason?: unknown;
  errors?: unknown;
  children?: unknown;
}

interface ValidationResponseWithInvalidParams extends ValidationResponse {
  'invalid-params': InvalidParam[];
}

const responseProperties = ['invalid-params', 'errors', 'message'] as const;
const validationErrorProperties = [
  'constraints',
  'path',
  'property',
  'field',
  'name',
  'message',
  'reason',
  'errors',
  'children',
] as const;

export function extractInvalidParams(responseBody: ReturnType<HttpException['getResponse']>): InvalidParam[] {
  if (!isValidationResponse(responseBody)) {
    return [];
  }

  if (hasInvalidParams(responseBody)) {
    return responseBody['invalid-params'];
  }

  const errors = responseBody.errors;
  const message = responseBody.message;

  if (Array.isArray(errors)) {
    return normalizeValidationArray(errors);
  }

  if (Array.isArray(message)) {
    return normalizeValidationArray(message);
  }

  return [];
}

function normalizeValidationArray(errors: unknown[]): InvalidParam[] {
  const invalidParams = errors.flatMap((error) => normalizeValidationEntry(error));

  return invalidParams.length > 0 ? invalidParams : [{ name: 'request', reason: 'Invalid request.' }];
}

function normalizeValidationEntry(error: unknown): InvalidParam[] {
  if (typeof error === 'string') {
    return [{ name: 'request', reason: error }];
  }

  if (!isValidationError(error)) {
    return [];
  }

  if (hasInvalidParam(error)) {
    return [{ name: error.name, reason: error.reason }];
  }

  if (hasClassValidatorConstraints(error)) {
    return normalizeClassValidatorConstraint(error);
  }

  const nestedErrors = error.errors ?? error.children;
  const nestedInvalidParams = Array.isArray(nestedErrors)
    ? normalizeValidationArray(nestedErrors).map((param) => prefixNestedParam(error, param))
    : [];

  const name = validationPath(error);
  const reason = validationReason(error);
  const currentInvalidParam = reason ? [{ name, reason }] : [];

  return [...currentInvalidParam, ...nestedInvalidParams];
}

function normalizeClassValidatorConstraint(error: ValidationError): InvalidParam[] {
  if (!isNonArrayObject(error.constraints)) {
    return [];
  }

  const name = validationPath(error);

  return Object.values(error.constraints)
    .filter((message): message is string => typeof message === 'string' && message.length > 0)
    .map((reason) => ({ name, reason }));
}

function prefixNestedParam(parent: ValidationError, param: InvalidParam): InvalidParam {
  const parentName = validationPath(parent);

  if (parentName === 'request' || param.name === 'request') {
    return param;
  }

  if (param.name.startsWith(`${parentName}.`)) {
    return param;
  }

  return {
    name: `${parentName}.${param.name}`,
    reason: param.reason,
  };
}

function hasInvalidParams(value: ValidationResponse): value is ValidationResponseWithInvalidParams {
  const invalidParams = value['invalid-params'];

  return Array.isArray(invalidParams) && invalidParams.every((param) => isInvalidParam(param));
}

function hasInvalidParam(value: ValidationError): value is ValidationError & { name: string; reason: string } {
  return typeof value.name === 'string' && typeof value.reason === 'string';
}

function isInvalidParam(value: unknown): value is InvalidParam {
  return isValidationError(value) && hasInvalidParam(value);
}

function hasClassValidatorConstraints(value: ValidationError): boolean {
  return isNonArrayObject(value.constraints);
}

function isValidationResponse<T>(value: T): value is T & ValidationResponse {
  return isNonArrayObject(value) && hasKnownProperty(value, responseProperties);
}

function isValidationError<T>(value: T): value is T & ValidationError {
  return isNonArrayObject(value) && hasKnownProperty(value, validationErrorProperties);
}

function isNonArrayObject<T>(value: T): value is T & object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKnownProperty<T>(value: T, properties: readonly string[]): boolean {
  return typeof value === 'object' && value !== null && properties.some((property) => Object.hasOwn(value, property));
}

function validationPath(error: ValidationError): string {
  const path = error.path ?? error.property ?? error.field ?? error.name;

  if (Array.isArray(path)) {
    return path.map(String).filter(Boolean).join('.') || 'request';
  }

  if (typeof path === 'string' && path.length > 0) {
    return path;
  }

  if (typeof path === 'number') {
    return String(path);
  }

  return 'request';
}

function validationReason(error: ValidationError): string | null {
  const message = error.message ?? error.reason;

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string').join('; ') || null;
  }

  return null;
}
