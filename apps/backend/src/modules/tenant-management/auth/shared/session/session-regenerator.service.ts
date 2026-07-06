import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

@Injectable()
export class SessionRegeneratorService {
  regenerate(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return reject(new InternalServerErrorException('Session is not initialized.'));
      }

      req.session.regenerate((error) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  destroy(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return resolve();
      }

      req.session.destroy((error) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }
}
