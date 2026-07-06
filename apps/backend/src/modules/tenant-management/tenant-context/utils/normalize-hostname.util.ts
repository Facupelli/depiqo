import { BadRequestException } from '@nestjs/common';
import { domainToASCII } from 'node:url';

const MAX_HOSTNAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

export function normalizeHostname(raw: string | undefined | null): string {
  if (typeof raw !== 'string') {
    throw new BadRequestException('Hostname is required');
  }

  let value = raw.trim().toLowerCase();

  if (!value) {
    throw new BadRequestException('Hostname is required');
  }

  if (value.includes('/') || value.includes('\\')) {
    throw new BadRequestException('Invalid hostname');
  }

  if (value.includes('@')) {
    throw new BadRequestException('Invalid hostname');
  }

  value = stripPort(value);
  value = stripTrailingDot(value);

  const ascii = domainToASCII(value);

  if (!ascii) {
    throw new BadRequestException('Invalid hostname');
  }

  if (ascii.length > MAX_HOSTNAME_LENGTH) {
    throw new BadRequestException('Hostname is too long');
  }

  if (ascii === 'localhost') {
    return ascii;
  }

  const labels = ascii.split('.');

  if (labels.length < 2) {
    throw new BadRequestException('Invalid hostname');
  }

  for (const label of labels) {
    validateLabel(label);
  }

  return ascii;
}

function stripPort(hostname: string): string {
  if (hostname.startsWith('[')) {
    throw new BadRequestException('IPv6 hostnames are not supported');
  }

  const parts = hostname.split(':');

  if (parts.length === 1) {
    return hostname;
  }

  if (parts.length !== 2) {
    throw new BadRequestException('Invalid hostname');
  }

  const [host, port] = parts;

  if (!host || !port) {
    throw new BadRequestException('Invalid hostname');
  }

  if (!/^\d+$/.test(port)) {
    throw new BadRequestException('Invalid hostname port');
  }

  return host;
}

function stripTrailingDot(hostname: string): string {
  return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
}

function validateLabel(label: string): void {
  if (!label) {
    throw new BadRequestException('Invalid hostname');
  }

  if (label.length > MAX_LABEL_LENGTH) {
    throw new BadRequestException('Invalid hostname');
  }

  if (label.startsWith('-') || label.endsWith('-')) {
    throw new BadRequestException('Invalid hostname');
  }

  if (!/^[a-z0-9-]+$/.test(label)) {
    throw new BadRequestException('Invalid hostname');
  }
}
