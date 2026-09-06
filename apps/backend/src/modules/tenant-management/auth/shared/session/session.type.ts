import 'express-session';

import { AuthActorType } from '../auth.types';

declare module 'express-session' {
  interface SessionData {
    workingBranchId?: string | null;
  }
}

export type AuthSessionPayload = {
  actorType: AuthActorType;
  actorId: string;
  sessionVersion: number;
};
