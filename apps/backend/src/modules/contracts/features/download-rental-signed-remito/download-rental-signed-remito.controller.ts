import { Controller, Get, HttpStatus, Param, Res, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import {
  DownloadRentalSignedRemitoError,
  DownloadRentalSignedRemitoErrorCode,
} from './download-rental-signed-remito.errors';
import { DownloadRentalSignedRemitoResult } from './download-rental-signed-remito.handler';
import { DownloadRentalSignedRemitoQuery } from './download-rental-signed-remito.query';
import { DownloadRentalSignedRemitoParamsDto } from './download-rental-signed-remito.request.dto';

@Controller('contracts/rentals')
export class DownloadRentalSignedRemitoHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/signed-remito/download')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async download(
    @Param() params: DownloadRentalSignedRemitoParamsDto,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.queryBus.execute<DownloadRentalSignedRemitoQuery, DownloadRentalSignedRemitoResult>(
      new DownloadRentalSignedRemitoQuery(user.tenantId, params.rentalId),
    );

    if (result.isErr()) {
      throw toDownloadRentalSignedRemitoProblem(result.error);
    }

    const document = result.value;
    response.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'Content-Length': document.byteSize,
    });
    document.stream.pipe(response);
  }
}

function toDownloadRentalSignedRemitoProblem(error: DownloadRentalSignedRemitoError): ProblemException {
  const problem = downloadRentalSignedRemitoProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const downloadRentalSignedRemitoProblemMap = {
  'contracts.signed_remito_not_found': {
    type: createProblemType('contracts/signed-remito-not-found'),
    title: 'Signed Remito not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'No signed Remito was found for the requested rental.',
  },
  'contracts.signed_remito_unavailable': {
    type: createProblemType('contracts/signed-remito-unavailable'),
    title: 'Signed Remito unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The latest signed Remito is not available for download.',
  },
} satisfies Record<
  DownloadRentalSignedRemitoErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
