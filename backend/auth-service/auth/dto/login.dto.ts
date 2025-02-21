import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    mfaCode: z.string().optional(),
});

export class LoginDto extends createZodDto(LoginSchema) {}