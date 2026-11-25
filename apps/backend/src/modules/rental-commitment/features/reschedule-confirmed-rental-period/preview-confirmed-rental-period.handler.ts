import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { PreviewConfirmedRentalPeriodResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { ConfirmedRentalReschedulingPreparationService } from '../../application/confirmed-rental-rescheduling-preparation.service';
import { RentalRepository } from '../../persistence/rental.repository';
import { PreviewConfirmedRentalPeriodQuery } from './preview-confirmed-rental-period.query';
import {
  RescheduleConfirmedRentalPeriodError,
  rescheduleConfirmedRentalPeriodError,
} from './reschedule-confirmed-rental-period.errors';

export type PreviewConfirmedRentalPeriodResult = Result<
  PreviewConfirmedRentalPeriodResponseDto,
  RescheduleConfirmedRentalPeriodError
>;

@QueryHandler(PreviewConfirmedRentalPeriodQuery)
export class PreviewConfirmedRentalPeriodHandler implements IQueryHandler<
  PreviewConfirmedRentalPeriodQuery,
  PreviewConfirmedRentalPeriodResult
> {
  constructor(
    private readonly rentals: RentalRepository,
    private readonly preparation: ConfirmedRentalReschedulingPreparationService,
  ) {}

  async execute(query: PreviewConfirmedRentalPeriodQuery): Promise<PreviewConfirmedRentalPeriodResult> {
    const { tenantId, rentalId } = query.props;
    const rental = await this.rentals.findById(tenantId, rentalId);
    if (!rental)
      return err(rescheduleConfirmedRentalPeriodError('rental_commitment.rental_not_found', 'Rental not found.'));
    const prepared = await this.preparation.prepare({ ...query.props, rental });
    if (prepared.isErr()) return err(prepared.error);
    return ok(prepared.value.preview);
  }
}
