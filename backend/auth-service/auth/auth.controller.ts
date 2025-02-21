import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Get,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
    LoginResponse,
    RegisterResponse,
    MfaSetupResponse,
    TokenResponse,
    UserResponse,
    HateoasLinks,
} from './interfaces/auth.interfaces';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
        const result = await this.authService.register(registerDto);

        return {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            _links: {
                self: { href: '/auth/register' },
                login: { href: '/auth/login' },
                setupMfa: { href: '/auth/mfa/setup' },
            },
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User successfully logged in' })
    async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
        const result = await this.authService.login(loginDto);

        if (result.mfaRequired) {
            return {
                mfaRequired: true,
                userId: result.userId,
                _links: {
                    verifyMfa: { href: '/auth/mfa/verify' },
                },
            };
        }

        return {
            mfaRequired: false,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            _links: {
                self: { href: '/auth/login' },
                profile: { href: '/users/me' },
                logout: { href: '/auth/logout' },
            },
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    async refreshToken(@Body('refreshToken') refreshToken: string): Promise<TokenResponse & { _links: HateoasLinks }> {
        const result = await this.authService.refreshToken(refreshToken);

        return {
            ...result,
            _links: {
                self: { href: '/auth/refresh' },
                profile: { href: '/users/me' },
                logout: { href: '/auth/logout' },
            },
        };
    }

    @Post('mfa/setup')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Setup MFA' })
    async setupMfa(@Req() req: { user: { id: string } }): Promise<MfaSetupResponse> {
        const result = await this.authService.setupMfa(req.user.id);

        return {
            ...result,
            _links: {
                self: { href: '/auth/mfa/setup' },
                verify: { href: '/auth/mfa/verify' },
                disable: { href: '/auth/mfa/disable' },
            },
        };
    }

    @Post('mfa/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify MFA code' })
    async verifyMfa(
        @Body('userId') userId: string,
        @Body('code') code: string,
    ): Promise<TokenResponse & { _links: HateoasLinks }> {
        const result = await this.authService.verifyMfa(userId, code);

        return {
            ...result,
            _links: {
                self: { href: '/auth/mfa/verify' },
                profile: { href: '/users/me' },
                logout: { href: '/auth/logout' },
            },
        };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user' })
    async logout(@Req() req: { user: { id: string } }): Promise<{ _links: HateoasLinks }> {
        await this.authService.logout(req.user.id);

        return {
            _links: {
                login: { href: '/auth/login' },
            },
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@Req() req: { user: { id: string } }): Promise<{ user: UserResponse; _links: HateoasLinks }> {
        const user = await this.authService.getProfile(req.user.id);

        return {
            user,
            _links: {
                self: { href: '/auth/me' },
                updateProfile: { href: '/users/me' },
                setupMfa: { href: '/auth/mfa/setup' },
                logout: { href: '/auth/logout' },
            },
        };
    }
}