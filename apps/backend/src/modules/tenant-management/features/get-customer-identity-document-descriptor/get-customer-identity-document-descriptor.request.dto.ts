import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class GetCustomerIdentityDocumentDescriptorParamsDto extends createZodDto(z.object({ customerId: z.uuid() })) {}
