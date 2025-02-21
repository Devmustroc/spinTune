import {BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException} from "@nestjs/common";
import {Redis} from "ioredis";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import {PrismaService} from "../src/prisma/prisma.service";
import {UserService} from "../user/user.service";
import {ConfigService} from "@nestjs/config";
import {RabbitMQService} from "../src/rabbitmq/rabbitmq.service";

@Injectable()
export class MfaService {
    private readonly redis: Redis;
    private readonly APP_NAME = 'SpinTune';

    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly rabbitmqService: RabbitMQService
    ) {
        this.redis = new Redis({
            host: this.configService.get<string>('REDIS_HOST'),
            port: this.configService.get<number>('REDIS_PORT'),
        });
    }

    /**
     * Génère un nouveau secret MFA pour l'utilisateur
     */
    async generateSecret(userId: string) {
        const user = await this.userService.findById(userId);

        if (!user) {
            throw new UnauthorizedException('Utilisateur non trouvé');
        }

        const secret = speakeasy.generateSecret({
            name: `${this.APP_NAME}:${user.email}`,
        });

        if (!secret.otpauth_url) {
            throw new InternalServerErrorException('Une erreur est survenue lors de la configuration de la MFA');
        }

        // Stocker temporairement le secret MFA dans Redis
        await this.redis.setex(
            `mfa_setup:${userId}`,
            300, // 5 minutes d'expiration
            secret.base32,
        );

        // Générer le QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            qrCodeUrl,
            backupCodes: await this.generateBackupCodes(userId),
        };
    }

    /**
     * Vérifie et active la MFA pour l'utilisateur
     */
    async verifyAndEnableMfa(userId: string, token: string) {
        const setupSecret = await this.redis.get(`mfa_setup:${userId}`);

        if (!setupSecret) {
            throw new BadRequestException('Session de configuration MFA expirée');
        }

        const isValid = this.verifyToken(token, setupSecret);

        if (!isValid) {
            throw new UnauthorizedException('Code MFA invalide');
        }

        // Activer MFA pour l'utilisateur
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: true,
                mfaSecret: setupSecret,
            },
        });

        // Supprimer le secret temporaire
        await this.redis.del(`mfa_setup:${userId}`);

        // Émettre un événement
        await this.rabbitmqService.emit('user.mfa.enabled', { userId });

        return { success: true };
    }

    /**
     * Désactive la MFA pour l'utilisateur
     */
    async disableMfa(userId: string, token: string) {
        const user = await this.userService.findById(userId);

        if (!user) {
            throw new UnauthorizedException('Utilisateur non rencontré');
        }

        // Vérifier le code MFA ou le code de backup
        const isValid = this.validateToken(token, user.mfaSecret);

        if (!isValid) {
            throw new UnauthorizedException('Code MFA ou code de backup invalide');
        }

        // Désactiver MFA
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
                backupCodes: [],
            },
        });

        // Émettre un événement
        await this.rabbitmqService.emit('user.mfa.disabled', { userId });

        return { success: true };
    }

    /**
     * Valide un token MFA
     */
    async validateToken(userId: string, token: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.mfaEnabled) {
            return false;
        }

        // Vérifier si c'est un code de backup
        if (user.backupCodes.includes(token)) {
            await this.useBackupCode(userId, token);
            return true;
        }

        return this.verifyToken(token, user.mfaSecret);
    }

    /**
     * Régénère les codes de backup
     */
    async regenerateBackupCodes(userId: string, token: string) {
        const isValid = await this.validateToken(userId, token);
        if (!isValid) {
            throw new UnauthorizedException('Code MFA ou code de backup invalide');
        }

        return this.generateBackupCodes(userId);
    }

    /**
     *  Méthodes privées
     */
    private verifyToken(token: string, secret: string): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1, // Permet une fenêtre de 30 secondes avant/après
        });
    }

    private async generateBackupCodes(userId: string) {
        const codes = Array.from({ length: 10 }, () =>
            Math.random().toString(36).substring(2, 10).toUpperCase(),
        );

        await this.prisma.user.update({
            where: { id: userId },
            data: { backupCodes: codes },
        })
    }

    private async useBackupCode(userId: string, code: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                backupCodes: {
                    set: (await this.prisma.user.findUnique({
                        where: { id: userId },
                    })).backupCodes.filter((c) => c !== code),
                },
            },
        });
    }
}