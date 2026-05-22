import { replaceProductTypeAccessoryLinksSchema } from '@repo/schemas';
import { createZodDto } from 'nestjs-zod';

export class ReplaceProductTypeAccessoryLinksRequestDto extends createZodDto(replaceProductTypeAccessoryLinksSchema) {}
