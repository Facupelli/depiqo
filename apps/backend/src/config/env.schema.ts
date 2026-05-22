import { z } from 'zod';

import { NotificationChannel } from 'src/modules/notifications/domain/notification-channel.enum';

const notificationChannelSchema = z.enum(NotificationChannel);

const notificationsMutedChannelsByEnvSchema = z.preprocess((value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.record(z.string(), z.array(notificationChannelSchema)).default({}));

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.url(),
  DATABASE_POOL_SIZE: z.coerce.number().default(10),

  JWT_SECRET: z.string(),
  JWT_EXPIRATION_TIME_SECONDS: z.coerce.number().default(3600),

  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRATION_TIME_SECONDS: z.coerce.number().default(604800), // 7 days

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_AUTH_STATE_SECRET: z.string(),
  GOOGLE_AUTH_STATE_EXPIRATION_TIME_SECONDS: z.coerce.number().default(600),
  GOOGLE_AUTH_HANDOFF_EXPIRATION_TIME_SECONDS: z.coerce.number().default(300),

  CLOUDFLARE_API_TOKEN: z.string(),
  CLOUDFLARE_ZONE_ID: z.string(),

  R2_ACCOUNT_ID: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  DOCUMENT_SIGNING_SESSION_TTL_SECONDS: z.coerce.number().default(604800),

  RESEND_API_KEY: z.string(),
  NOTIFICATIONS_EMAIL_FROM: z.string(),
  NOTIFICATIONS_EMAIL_FROM_NAME: z.string().optional(),
  NOTIFICATIONS_EMAIL_REPLY_TO: z.string().optional(),
  NOTIFICATIONS_MUTED_CHANNELS_BY_ENV: notificationsMutedChannelsByEnvSchema,

  INTERNAL_API_TOKEN: z.string(),
  ROOT_DOMAIN: z.string(),
});

export type Env = z.infer<typeof EnvSchema>;
