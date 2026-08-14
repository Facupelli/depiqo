import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { DetachOfferPricingCommand } from './detach-offer-pricing.command';
import { DetachOfferPricingError, detachOfferPricingError } from './detach-offer-pricing.errors';

export type DetachOfferPricingResult = Result<void, DetachOfferPricingError>;

@CommandHandler(DetachOfferPricingCommand)
export class DetachOfferPricingHandler implements ICommandHandler<DetachOfferPricingCommand, DetachOfferPricingResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DetachOfferPricingCommand): Promise<DetachOfferPricingResult> {
    const result = await this.prisma.client.v2RentalOfferPricing.updateMany({
      where: {
        id: command.rentalOfferPricingId,
        tenantId: command.tenantId,
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return err(
        detachOfferPricingError(
          'pricing.rental_offer_pricing_not_found',
          'Rental offer pricing was not found.',
          undefined,
          {
            useCase: 'DetachOfferPricing',
            tenantId: command.tenantId,
            rentalOfferPricingId: command.rentalOfferPricingId,
          },
        ),
      );
    }

    return ok(undefined);
  }
}
