// Storefront uploads use customers/{customerId}/identity-document-{timestamp}.{extension}.
// A stored key is not proof that the object still exists in R2.
export function isCustomerIdentityDocumentReference(reference: string, customerId: string): boolean {
  const prefix = `customers/${customerId}/identity-document-`;
  return reference.startsWith(prefix) && /^\d+\.[A-Za-z0-9_-]+$/.test(reference.slice(prefix.length));
}
