export interface RentalRemitoForSigningReadModel {
  contractId: string;
  rentalId: string;
  customerId: string | null;
  customerEmail: string | null;
  buffer: Buffer;
  documentNumber: string;
  fileName: string;
}
