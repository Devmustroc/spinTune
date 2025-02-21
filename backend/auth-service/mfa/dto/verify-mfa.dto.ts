import { z } from 'zod';
import { createZodDto } from "nestjs-zod";

const VerifyMfaSchema = z.object({
    token: z.string().min(6).max(8),
});

export class VerifyMfaDto extends createZodDto(VerifyMfaSchema) {}