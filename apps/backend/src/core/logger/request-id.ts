import type { IncomingMessage } from 'node:http';

export function readRequestId(request: IncomingMessage): string | undefined {
  const requestId = request.id;

  if (typeof requestId !== 'string') return undefined;
  if (requestId.length === 0) return undefined;
  if (requestId !== requestId.trim()) return undefined;
  if (/^(?:undefined|null)$/i.test(requestId)) return undefined;

  return requestId;
}
