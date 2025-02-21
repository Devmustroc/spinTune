import {ApiOperation, ApiTags} from "@nestjs/swagger";
import {Body, Controller, Get, Put, Req, UseGuards} from "@nestjs/common";
import {UserService} from "./user.service";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {UpdateUserDto} from "./dto/update-user.dto";

@ApiTags('users')
@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) {}

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Récupérer le profil de l’utilisateur' })
    async getProfile(@Req() req: any) {
        const user = await this.userService.findById(req.user.id);
        return {
            data: user,
            _links: {
                self: { href: '/users/me' },
                updateProfile: { href: '/users/me' },
                changePassword: { href: '/auth/change-password' },
            },
        };
    }

    @Put('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Modifier le profil de l’utilisateur' })
    async updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
        const user = await this.userService.update(req.user.id, updateUserDto);

        return {
            data: user,
            _links: {
                self: { href: '/users/me' },
                changePassword: { href: '/auth/change-password' },
            }
        }
    }
}