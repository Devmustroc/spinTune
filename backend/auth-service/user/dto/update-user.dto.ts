import { z } from 'zod';
import { createZodDto } from "nestjs-zod";

const UpdateUserSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    email: z.string().email().optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}