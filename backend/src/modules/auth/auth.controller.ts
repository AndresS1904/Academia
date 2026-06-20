import {
  Controller, Post, Get, Patch, Body, Request, Response,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const IS_PROD = process.env.NODE_ENV === 'production';

/** Opciones de cookie segura */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── Registro ────────────────────────────────────────────────
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registros/min por IP
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.register(dto);
    res.cookie('acae_auth', result.access_token, cookieOptions());
    return { user: result.user };
  }

  // ── Login ────────────────────────────────────────────────────
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos/min por IP
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('acae_auth', result.access_token, cookieOptions());
    return {
      mustChangePassword: result.mustChangePassword,
      user: result.user,
    };
  }

  // ── Logout ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Response({ passthrough: true }) res: ExpressResponse) {
    await this.authService.incrementTokenVersion(req.user.id);
    res.clearCookie('acae_auth', { path: '/' });
    return { message: 'Sesión cerrada' };
  }

  // ── Perfil ───────────────────────────────────────────────────
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  // ── Editar perfil ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req: any, @Body() dto: { email?: string; phone?: string }) {
    return this.authService.updateMe(req.user.id, dto);
  }

  // ── Cambiar contraseña ────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  changePassword(
    @Request() req: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }

  // ── Forzar nueva contraseña (primer login) ────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('me/set-new-password')
  setNewPassword(@Request() req: any, @Body() dto: { newPassword: string }) {
    return this.authService.setNewPassword(req.user.id, dto.newPassword);
  }

  // ── Olvidé mi contraseña ─────────────────────────────────────
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests/min
  @Post('forgot-password')
  forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto.email);
  }

  // ── Resetear contraseña ──────────────────────────────────────
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: { token: string; newPassword: string }) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ── Upload avatar ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = `/uploads/avatars/${file.filename}`;
    return this.authService.updateAvatar(req.user.id, url);
  }
}
