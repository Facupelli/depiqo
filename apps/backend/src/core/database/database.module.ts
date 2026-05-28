import { Global, Module } from '@nestjs/common';

import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, PrismaUnitOfWork],
  exports: [PrismaService, PrismaUnitOfWork],
})
export class DatabaseModule {}
