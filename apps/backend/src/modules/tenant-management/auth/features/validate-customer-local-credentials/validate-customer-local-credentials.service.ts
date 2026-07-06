import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2PasswordAlgorithm } from 'src/generated/prisma/enums';
import { AuthCustomer, AuthRequestMetadata, normalizeEmail, toAuthCustomer } from '../../shared/auth.types';
import { PasswordService } from '../../shared/password/password.service';

@Injectable()
export class ValidateCustomerLocalCredentialsService {
  private readonly invalidCredentialsError = new UnauthorizedException('Invalid email or password.');

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async validateCustomerLocalCredentials(input: {
    tenantId: string;
    email: string;
    password: string;
    metadata?: AuthRequestMetadata;
  }): Promise<AuthCustomer> {
    const email = normalizeEmail(input.email);

    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        tenantId: input.tenantId,
        email,
        deletedAt: null,
      },
    });

    if (!customer?.passwordHash) {
      throw this.invalidCredentialsError;
    }

    const isPasswordValid = await this.passwordService.verifyPassword({
      password: input.password,
      hash: customer.passwordHash,
      algorithm: V2PasswordAlgorithm.ARGON2ID,
    });

    if (!isPasswordValid) {
      throw this.invalidCredentialsError;
    }

    if (!customer.isActive) {
      throw this.invalidCredentialsError;
    }

    const updatedCustomer = await this.prisma.client.v2RentalCustomer.update({
      where: { id: customer.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return toAuthCustomer(updatedCustomer);
  }
}
