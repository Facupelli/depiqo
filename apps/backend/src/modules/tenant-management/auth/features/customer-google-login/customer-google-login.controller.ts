import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from '../../shared/csrf/skip-csrf.decorator';
import { CustomerGoogleLoginRequestDto } from './customer-google-login.request.dto';
import { CustomerGoogleLoginService } from './customer-google-login.service';

@Public()
@SkipCsrf()
@Controller('auth/customer/google')
export class CustomerGoogleLoginController {
  constructor(private readonly customerGoogleLoginService: CustomerGoogleLoginService) {}

  @Post('handoff')
  @HttpCode(200)
  async createHandoff(
    @Body() dto: CustomerGoogleLoginRequestDto,
  ): Promise<{ ticket: string; canonicalHost: string; returnHost?: string }> {
    return this.customerGoogleLoginService.createHandoff(dto);
  }
}
