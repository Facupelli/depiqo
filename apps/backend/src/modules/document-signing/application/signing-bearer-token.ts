export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  const value = authorizationHeader?.trim();

  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim() || null;
}
