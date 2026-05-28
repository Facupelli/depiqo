import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { CsrfService } from '../../shared/csrf/csrf.service';
import { Public } from 'src/core/decorators/public.decorator';

@Public()
@Controller('v2/auth')
export class GetCsrfTokenController {
  constructor(private readonly csrfService: CsrfService) {}

  @Get('csrf')
  getCsrfToken(@Req() req: Request): { csrfToken: string } {
    return {
      csrfToken: this.csrfService.getOrCreateToken(req),
    };
  }
}
