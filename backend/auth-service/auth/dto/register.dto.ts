import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}