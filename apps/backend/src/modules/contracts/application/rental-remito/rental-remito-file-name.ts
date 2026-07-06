export interface BuildRentalRemitoFileNameInput {
  customerName: string | null;
  documentNumber: string;
  rentalId: string;
  signed?: boolean;
}

export function buildRentalRemitoFileName(input: BuildRentalRemitoFileNameInput): string {
  const customerSlug = slugify(input.customerName ?? '');
  const documentSlug = slugify(input.documentNumber);
  const fallback = input.rentalId.slice(0, 8);

  const base = [customerSlug || 'rental', documentSlug || fallback].filter(Boolean).join('-');
  const suffix = input.signed ? '-signed' : '';

  return `remito-${base}${suffix}.pdf`;
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
