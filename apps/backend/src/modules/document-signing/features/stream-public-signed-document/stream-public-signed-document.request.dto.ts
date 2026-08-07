import { StreamPublicSignedReceiptDocumentQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class StreamPublicSignedDocumentQueryDto extends createZodDto(StreamPublicSignedReceiptDocumentQuerySchema) {}
