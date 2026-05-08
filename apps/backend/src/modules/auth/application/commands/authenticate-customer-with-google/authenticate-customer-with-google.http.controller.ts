import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';

import { AuthenticateCustomerWithGoogleCommand } from './authenticate-customer-with-google.command';
import { AuthenticateCustomerWithGoogleResult } from './authenticate-customer-with-google.command-handler';
import { AuthenticateCustomerWithGoogleRequestDto } from './authenticate-customer-with-google.request.dto';
import {
  CustomerGoogleIdentityLinkedToUserError,
  CustomerUnavailableForAuthenticationError,
  InvalidGoogleAuthenticationError,
  InvalidGoogleAuthenticationStateError,
} from '../../../domain/errors/auth.errors';

@Controller('auth')
export class AuthenticateCustomerWithGoogleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('customer/google')
  @HttpCode(HttpStatus.OK)
  async authenticate(@Body() dto: AuthenticateCustomerWithGoogleRequestDto) {
    console.log('AUTH CUSTOMER GOOGLE');

    const result = await this.commandBus.execute<
      AuthenticateCustomerWithGoogleCommand,
      AuthenticateCustomerWithGoogleResult
    >(new AuthenticateCustomerWithGoogleCommand(dto.code, dto.redirectUri, dto.state, dto.codeVerifier));

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof InvalidGoogleAuthenticationError) {
        throw new UnauthorizedException(error.message);
      }

      if (error instanceof InvalidGoogleAuthenticationStateError) {
        throw new UnauthorizedException(error.message);
      }

      if (error instanceof CustomerGoogleIdentityLinkedToUserError) {
        throw new UnauthorizedException(error.message);
      }

      if (error instanceof CustomerUnavailableForAuthenticationError) {
        throw new UnauthorizedException(error.message);
      }

      throw error;
    }

    return {
      handoff_token: result.value.handoffToken,
      portal_origin: result.value.portalOrigin,
    };
  }
}
