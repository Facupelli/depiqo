import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { EnvSchema } from './env.schema';
import z from 'zod';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (env: NodeJS.ProcessEnv) => {
        const parsed = EnvSchema.safeParse(env);
        if (!parsed.success) {
          console.error('❌ Invalid Environment Variables:', z.treeifyError(parsed.error));
          throw new Error('Invalid Environment Variables');
        }
        return parsed.data;
      },
      load: [() => ({ database: { url: process.env.DATABASE_URL } })],
    }),
  ],
})
export class AppConfigModule {}
