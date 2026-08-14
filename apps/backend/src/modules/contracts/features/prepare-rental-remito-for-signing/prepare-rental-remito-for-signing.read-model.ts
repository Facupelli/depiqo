export interface RentalRemitoForSigningReadModel {
  contractId: string;
  unsignedArtifactId: string;
  rentalId: string;
  customerId: string | null;
  customerEmail: string | null;
  documentHash: string;
  documentNumber: string;
  fileName: string;
}
