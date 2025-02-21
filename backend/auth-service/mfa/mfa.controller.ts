import {Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards} from '@nestjs/common';
import {ApiBasicAuth, ApiOperation, ApiTags} from "@nestjs/swagger";
import {MfaService} from "./mfa.service";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {VerifyMfaDto} from "./dto/verify-mfa.dto";

@ApiTags('MFA')
@Controller('mfa')
@ApiBasicAuth()
export class MfaController {
    constructor(
        private readonly mfaService: MfaService
    ) {}

    @Post('setup')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Générer la configuration MFA' })
    async setup(@Req() req: any) {
        const result = await this.mfaService.generateSecret(req.user.id);

        return {
            data: result,
            _links: {
                self: { href: '/mfa/setup' },
                verify: { href: '/mfa/verify' },
                cancel: { href: '/mfa/cancel' },
            },
        };
    }

    @Post('disable')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Désactiver la configuration MFA' })
    async disable(@Req() req: any, @Body() verifyMfaDto: VerifyMfaDto) {
        const result = await this.mfaService.disableMfa(
            req.user.id,
            verifyMfaDto.token,
        );

        return {
            data: result,
            _links: {
                self: { href: '/mfa/disable' },
                setup: { href: '/mfa/setup' },
            },
        };
    }

    @Post('backup-codes')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Régénérer les codes de backup' })
    async regenerateBackupCodes(
        @Req() req: any,
        @Body() verifyMfaDto: VerifyMfaDto
    ) {
        const codes = await this.mfaService.regenerateBackupCodes(
            req.user.id,
            verifyMfaDto.token
        );

        return {
            data: { backupCodes: codes },
            _links: {
                self: { href: '/mfa/backup-codes' },
                disable: { href: '/mfa/disable' },
            }
        }
    }
}