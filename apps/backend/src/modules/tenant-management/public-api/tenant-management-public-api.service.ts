import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  RentalCustomerNotificationRecipient,
  TenantAdminNotificationRecipient,
  TenantManagementPublicApi,
  TenantManagementPublicApiError,
} from './tenant-management.public-api';

@Injectable()
export class TenantManagementPublicApiService extends TenantManagementPublicApi {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalCustomerNotificationRecipient(input: {
    tenantId: string;
    rentalCustomerId: string;
  }): Promise<Result<RentalCustomerNotificationRecipient, TenantManagementPublicApiError>> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: input.rentalCustomerId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!customer) {
      return err({
        code: 'RentalCustomerNotFound',
        message: `Rental customer "${input.rentalCustomerId}" was not found.`,
      });
    }

    return ok(customer);
  }

  async getTenantAdminNotificationRecipients(input: {
    tenantId: string;
  }): Promise<Result<TenantAdminNotificationRecipient[], TenantManagementPublicApiError>> {
    const users = await this.prisma.client.v2TenantUser.findMany({
      where: {
        tenantId: input.tenantId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        email: true,
        name: true,
      },
      distinct: ['email'],
    });

    return ok(
      users.map((user) => ({
        email: user.email,
        name: user.name ?? undefined,
      })),
    );
  }
}
