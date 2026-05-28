import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';

import { ExchangeCustomerGoogleHandoffCommand } from './exchange-customer-google-handoff.command';
import { ExchangeCustomerGoogleHandoffResult } from './exchange-customer-google-handoff.command-handler';
import { ExchangeCustomerGoogleHandoffRequestDto } from './exchange-customer-google-handoff.request.dto';
import {
  AuthHandoffTokenAlreadyUsedError,
  AuthHandoffTokenExpiredError,
  CustomerUnavailableForAuthenticationError,
  InvalidAuthHandoffTokenError,
} from '../../../domain/errors/auth.errors';
import { SkipCsrf } from 'src/modules/v2/tenant-management/auth/shared/csrf/skip-csrf.decorator';

@Controller('auth')
export class ExchangeCustomerGoogleHandoffHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @SkipCsrf()
  @Post('customer/google/handoff')
  @HttpCode(HttpStatus.OK)
  async exchange(@Body() dto: ExchangeCustomerGoogleHandoffRequestDto) {
    console.log('HANDOFF ENDPOINT', dto);
    const result = await this.commandBus.execute<
      ExchangeCustomerGoogleHandoffCommand,
      ExchangeCustomerGoogleHandoffResult
    >(new ExchangeCustomerGoogleHandoffCommand(dto.handoffToken));

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof InvalidAuthHandoffTokenError) {
        throw new UnauthorizedException(error.message);
      }

      if (error instanceof AuthHandoffTokenAlreadyUsedError) {
        throw new UnauthorizedException(error.message);
      }

      if (error instanceof AuthHandoffTokenExpiredError) {
        throw new UnauthorizedException(error.message);
      }

      if (error instanceof CustomerUnavailableForAuthenticationError) {
        throw new UnauthorizedException(error.message);
      }

      throw error;
    }

    return { access_token: result.value.accessToken, refresh_token: result.value.refreshToken };
  }
}
