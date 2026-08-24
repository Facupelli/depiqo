import { ChangeRentalDetailsResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeRentalDetailsResponseDto extends createZodDto(ChangeRentalDetailsResponseSchema) {}
