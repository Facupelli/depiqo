import { Injectable } from '@nestjs/common';

export interface SigningAcceptanceText {
  version: string;
  text: string;
}

@Injectable()
export class SigningAcceptanceTextService {
  private readonly current: SigningAcceptanceText = {
    version: 'v1-es-AR',
    text: 'Declaro que he leído el documento, que los datos consignados son correctos y que acepto firmarlo electrónicamente. Reconozco que esta aceptación queda asociada al documento, a su hash criptográfico y a la evidencia técnica de la sesión de firma.',
  };

  getCurrentAcceptanceText(): SigningAcceptanceText {
    return this.current;
  }

  getAcceptanceTextByVersion(version: string): SigningAcceptanceText | null {
    return version === this.current.version ? this.current : null;
  }
}
