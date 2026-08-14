import { AuthActorType } from '../auth.types';

export type AuthSessionPayload = {
  actorType: AuthActorType;
  actorId: string;
  sessionVersion: number;
};
