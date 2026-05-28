import { SetMetadata } from '@nestjs/common';
import { AuthActorType } from '../auth.types';

export const AUTH_ACTOR_ACCESS_KEY = 'v2AuthActorAccess';

export const AllowAuthActors = (...actorTypes: AuthActorType[]) => SetMetadata(AUTH_ACTOR_ACCESS_KEY, actorTypes);
