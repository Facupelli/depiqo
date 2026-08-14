import { CreateOwnerWithContractBodySchema, ExplicitOffsetInstantSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CreateOwnerWithContractApplicationInputSchema = CreateOwnerWithContractBodySchema.transform((body) => ({
  ...body,
  contract: {
    ...body.contract,
    validFrom: ExplicitOffsetInstantSchema.parse(body.contract.validFrom),
    validTo:
      body.contract.validTo === undefined || body.contract.validTo === null
        ? body.contract.validTo
        : ExplicitOffsetInstantSchema.parse(body.contract.validTo),
  },
})).refine(
  ({ contract }) =>
    contract.validTo === undefined || contract.validTo === null || contract.validTo > contract.validFrom,
  {
    message: 'validTo must be after validFrom.',
    path: ['contract', 'validTo'],
  },
);

export class CreateOwnerWithContractRequestDto extends createZodDto(CreateOwnerWithContractApplicationInputSchema) {}
