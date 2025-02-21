import {Injectable} from "@nestjs/common";
import {PrismaService} from "../src/prisma/prisma.service";
import {Prisma as P} from "@prisma/client";

@Injectable()
export class UserService {
    constructor(
        private  prisma: PrismaService
    ) {}

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                mfaEnabled: true,
                createdAt: true
            },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        })
    }

    async update(id: string, data: P.UserUpdateInput) {
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                mfaEnabled: true,
                createdAt: true
            },
        });
    }
}