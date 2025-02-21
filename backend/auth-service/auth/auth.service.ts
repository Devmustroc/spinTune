import {
    Injectable,
    UnauthorizedException,
    ConflictException, InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
    LoginResponse,
    TokenResponse,
    UserResponse,
    MfaSetupResponse,
} from './interfaces/auth.interfaces';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { Redis } from 'ioredis';
import {PrismaService} from "../src/prisma/prisma.service";
import {RabbitMQService} from "../src/rabbitmq/rabbitmq.service";

@Injectable()
export class AuthService {
    private readonly redis: Redis;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly rabbitmqService: RabbitMQService,
    ) {
        this.redis = new Redis({
            host: this.configService.get<string>('REDIS_HOST'),
            port: this.configService.get<number>('REDIS_PORT'),
        });
    }

    /**
     * Inscription d'un nouvel utilisateur
     */
    async register(registerDto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Un utilisateur avec cet email existe déjà');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 12);
        const backupCodes = this.generateBackupCodes();

        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                password: hashedPassword,
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                backupCodes,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                mfaEnabled: true,
            },
        });

        await this.rabbitmqService.emit('user.created', {
            userId: user.id,
            email: user.email,
        });

        const tokens = await this.generateTokens(user.id);

        return {
            user,
            ...tokens,
        };
    }

    /**
     * Connexion d'un utilisateur
     */
    async login(loginDto: LoginDto): Promise<LoginResponse> {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        if (user.mfaEnabled && !loginDto.mfaCode) {
            return {
                mfaRequired: true,
                userId: user.id,
                _links: {
                    verifyMfa: { href: '/auth/mfa/verify' },
                },
            };
        }

        if (user.mfaEnabled && loginDto.mfaCode) {
            const isMfaValid = await this.verifyMfaToken(user.id, loginDto.mfaCode);
            if (!isMfaValid) {
                throw new UnauthorizedException('Code MFA invalide');
            }
        }

        const tokens = await this.generateTokens(user.id);
        await this.storeUserSession(user.id, tokens.accessToken);

        return {
            mfaRequired: false,
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            _links: {
                self: { href: '/auth/login' },
                profile: { href: '/users/me' },
                logout: { href: '/auth/logout' },
            },
        };
    }

    /**
     * Configuration de la MFA
     */
    async setupMfa(userId: string): Promise<MfaSetupResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('Utilisateur non trouvé');
        }

        const secret = speakeasy.generateSecret({
            name: `SpinTune:${user.email}`,
        });

        if (!secret.otpauth_url) {
            throw new InternalServerErrorException('Une erreur est survenue lors de la configuration de la MFA');
        }

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        await this.redis.setex(
            `mfa_setup:${userId}`,
            300,
            secret.base32,
        );

        return {
            secret: secret.base32,
            qrCodeUrl,
            _links: {
                verify: { href: '/auth/mfa/verify' },
            },
        };
    }

    /**
     * Vérification du code MFA
     */
    async verifyMfa(userId: string, code: string): Promise<TokenResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('Utilisateur non trouvé');
        }

        const setupSecret = await this.redis.get(`mfa_setup:${userId}`);
        if (setupSecret) {
            const isValid = await this.verifyMfaToken(userId, code, setupSecret);
            if (isValid) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        mfaEnabled: true,
                        mfaSecret: setupSecret,
                    },
                });
                await this.redis.del(`mfa_setup:${userId}`);
            }
        }

        const isValid = await this.verifyMfaToken(userId, code);
        if (!isValid) {
            throw new UnauthorizedException('Code MFA invalide');
        }

        return this.generateTokens(userId);
    }

    /**
     * Rafraîchissement du token
     */
    async refreshToken(refreshToken: string): Promise<TokenResponse> {
        try {
            const decoded = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: decoded.sub },
            });

            if (!user || !user.refreshTokens.includes(refreshToken)) {
                throw new UnauthorizedException('Token de rafraîchissement invalide');
            }

            return this.generateTokens(user.id);
        } catch (error) {
            throw new UnauthorizedException('Token de rafraîchissement invalide');
        }
    }

    /**
     * Déconnexion
     */
    async logout(userId: string): Promise<void> {
        await Promise.all([
            this.redis.del(`session:${userId}`),
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    refreshTokens: [],
                },
            }),
        ]);

        await this.rabbitmqService.emit('user.logout', { userId });
    }

    /**
     * Récupération du profil
     */
    async getProfile(userId: string): Promise<UserResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                mfaEnabled: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Utilisateur non trouvé');
        }

        return user;
    }

    /**
     * Génération des tokens
     */
    private async generateTokens(userId: string): Promise<TokenResponse> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId },
                {
                    secret: this.configService.get('JWT_SECRET'),
                    expiresIn: '15m',
                },
            ),
            this.jwtService.signAsync(
                { sub: userId },
                {
                    secret: this.configService.get('JWT_REFRESH_SECRET'),
                    expiresIn: '7d',
                },
            ),
        ]);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                refreshTokens: {
                    push: refreshToken,
                },
            },
        });

        return { accessToken, refreshToken };
    }

    /**
     * Vérification du token MFA
     */
    private async verifyMfaToken(
        userId: string,
        code: string,
        secretOverride?: string,
    ): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (user.backupCodes.includes(code)) {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    backupCodes: user.backupCodes.filter((c) => c !== code),
                },
            });
            return true;
        }

        return speakeasy.totp.verify({
            secret: secretOverride || user.mfaSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });
    }

    /**
     * Stockage de la session utilisateur
     */
    private async storeUserSession(userId: string, accessToken: string): Promise<void> {
        await this.redis.setex(
            `session:${userId}`,
            900,
            accessToken,
        );
    }

    /**
     * Génération des codes de backup
     */
    private generateBackupCodes(): string[] {
        return Array.from({ length: 10 }, () =>
            Math.random().toString(36).substr(2, 10).toUpperCase(),
        );
    }
}