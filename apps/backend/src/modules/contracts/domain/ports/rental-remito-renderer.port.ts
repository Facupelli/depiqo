import { RentalRemitoPdfData } from '../../application/rental-remito/rental-remito-pdf-data';

export abstract class RentalRemitoRendererPort {
  abstract render(data: RentalRemitoPdfData): Promise<Buffer>;
}
