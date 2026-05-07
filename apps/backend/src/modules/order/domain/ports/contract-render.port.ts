export interface IncludedItem {
  name: string;
  quantity: number;
  notes: string | null;
  assignedAssetCount: number | null;
  assignedAssetIdentifiers: string[];
}

export interface EquipmentLine {
  name: string;
  quantity: number;
  /** Actual selected accessories for normalized orders; legacy included items only for historical orders. */
  includedItems: IncludedItem[];
}

export interface ContractPartyData {
  fullName: string;
  documentNumber: string;
  address: string;
  phone: string;
}

export interface SignedContractSummary {
  signatureImageDataUrl: string;
  recipientEmail: string;
  signedAt: string;
  sessionReference: string;
}

export interface ContractData {
  document: {
    /** e.g. "REMITO" or "PRESUPUESTO" */
    label: string;
    /** e.g. "Guarida-0001" — tenant name + order number */
    number: string;
    /** Section title shown above the equipment list */
    equipmentTitle: string;
    /** Formatted local date string — e.g. "20/3/2026" */
    pickupDate: string;
    /** Formatted local date string — e.g. "23/3/2026" */
    returnDate: string;
    /** Billing units for the rental period */
    jornadas: number;
    /** Formatted total price — e.g. "$ 374.368" */
    agreedPrice: string;
    /** Tenant brand logo used in the PDF header */
    logoUrl: string | null;
    /** Tenant admin signer signature image used in the rental signature block */
    rentalSignatureUrl: string | null;
    /** Whether the rental signature block should be rendered */
    showRentalSignatureBlock: boolean;
    /** Landlord identity block shown on the remito header */
    landlord: ContractPartyData;
    /** Tenant identity block shown on the remito header */
    tenant: ContractPartyData;
    /** Human-facing summary rendered only on final signed copies */
    signedSummary?: SignedContractSummary;
  };
  /** Flat list of equipment lines. PRODUCT items produce one line each.
   *  BUNDLE items are expanded into one line per component. */
  equipmentLines: EquipmentLine[];
}

export abstract class ContractRendererPort {
  abstract render(data: ContractData): Promise<Buffer>;
}
