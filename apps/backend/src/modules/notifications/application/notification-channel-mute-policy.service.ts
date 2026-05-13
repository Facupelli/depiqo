import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';

import { NotificationChannel } from '../domain/notification-channel.enum';

@Injectable()
export class NotificationChannelMutePolicy {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  isMuted(channel: NotificationChannel): boolean {
    const environment = this.configService.get('NODE_ENV');
    const mutedChannelsByEnv = this.configService.get('NOTIFICATIONS_MUTED_CHANNELS_BY_ENV');

    return (mutedChannelsByEnv[environment] ?? []).includes(channel);
  }
}
