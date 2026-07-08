import { InvalidParam } from './problem-details';

export function extractInvalidParams(responseBody: unknown): InvalidParam[] {
  if (typeof responseBody !== 'object' || responseBody === null) {
    return [];
  }

  const responseObject = responseBody as Record<string, unknown>;

  if (hasInvalidParams(responseObject)) {
    return responseObject['invalid-params'];
  }

  const errors = responseObject.errors;
  const message = responseObject.message;

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

  if (typeof error !== 'object' || error === null) {
    return [];
  }

  const errorObject = error as Record<string, unknown>;

  if (hasInvalidParam(errorObject)) {
    return [{ name: errorObject.name, reason: errorObject.reason }];
  }

  if (hasClassValidatorConstraints(errorObject)) {
    return normalizeClassValidatorConstraint(errorObject);
  }

  const nestedErrors = errorObject.errors ?? errorObject.children;
  const nestedInvalidParams = Array.isArray(nestedErrors)
    ? normalizeValidationArray(nestedErrors).map((param) => prefixNestedParam(errorObject, param))
    : [];

  const name = validationPath(errorObject);
  const reason = validationReason(errorObject);
  const currentInvalidParam = reason ? [{ name, reason }] : [];

  return [...currentInvalidParam, ...nestedInvalidParams];
}

function normalizeClassValidatorConstraint(error: Record<string, unknown>): InvalidParam[] {
  const constraints = error.constraints as Record<string, unknown>;
  const name = validationPath(error);

  return Object.values(constraints)
    .filter((message): message is string => typeof message === 'string' && message.length > 0)
    .map((reason) => ({ name, reason }));
}

function prefixNestedParam(parent: Record<string, unknown>, param: InvalidParam): InvalidParam {
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

function hasInvalidParams(value: Record<string, unknown>): value is Record<string, unknown> & {
  'invalid-params': InvalidParam[];
} {
  const invalidParams = value['invalid-params'];

  return Array.isArray(invalidParams) && invalidParams.every((param) => isInvalidParam(param));
}

function hasInvalidParam(value: Record<string, unknown>): value is Record<string, unknown> & InvalidParam {
  return isInvalidParam(value);
}

function isInvalidParam(value: unknown): value is InvalidParam {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.name === 'string' && typeof candidate.reason === 'string';
}

function hasClassValidatorConstraints(value: Record<string, unknown>): boolean {
  return typeof value.constraints === 'object' && value.constraints !== null;
}

function validationPath(error: Record<string, unknown>): string {
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

function validationReason(error: Record<string, unknown>): string | null {
  const message = error.message ?? error.reason;

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string').join('; ') || null;
  }

  return null;
}
