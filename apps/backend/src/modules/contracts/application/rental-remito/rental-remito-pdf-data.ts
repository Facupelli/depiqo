export type RentalRemitoPdfData = {
  document: {
    label: 'REMITO' | 'PRESUPUESTO';
    number: string;
    equipmentTitle: string;
    pickupDate: string;
    returnDate: string;
    jornadas: number;
    agreedPrice: string;
    logoUrl: string | null;
    rentalSignatureUrl: string | null;
    presentation: {
      includeLegalAnnex: boolean;
      showRentalSignatureBlock: boolean;
    };
    landlord: ContractPartyData;
    tenant: ContractPartyData;
    signedSummary?: SignedContractSummary;
  };
  equipmentLines: RentalRemitoEquipmentLine[];
};

export type ContractPartyData = {
  fullName: string;
  documentNumber: string;
  address: string;
  phone: string;
};

export type RentalRemitoEquipmentLine = {
  name: string;
  quantity: number;
  includedItems: RentalRemitoIncludedItem[];
};

export type RentalRemitoIncludedItem = {
  name: string;
  quantity: number;
};

export type SignedContractSummary = {
  signatureImageDataUrl: string;
  signerEmail: string | null;
  signedAt: string;
  sessionReference: string;
};
