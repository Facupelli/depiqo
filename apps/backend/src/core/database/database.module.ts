import { Global, Module } from '@nestjs/common';

import { IntegrationEventsModule } from '../domain/events/integration-events.module';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [IntegrationEventsModule],
  providers: [PrismaService, PrismaUnitOfWork],
  exports: [PrismaService, PrismaUnitOfWork],
})
export class DatabaseModule {}
