import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { RatePlan } from '../domain/rate-plan.aggregate';
import { RatePlanMapper } from './rate-plan.mapper';

@Injectable()
export class RatePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(ratePlan: RatePlan): Promise<void> {
    await this.prisma.client.v2RatePlan.create({
      data: RatePlanMapper.toCreateData(ratePlan),
    });
  }
}
