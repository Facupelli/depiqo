import { Request } from 'express';
import { AuthUser } from './auth.types';

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

export type LoginRequest = Request & {
  user: AuthUser;
};
