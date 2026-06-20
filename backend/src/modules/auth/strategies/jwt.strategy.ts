import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

/** Lee JWT primero de cookie httpOnly; Bearer solo en desarrollo */
function cookieOrBearer(req: Request): string | null {
  const fromCookie = req?.cookies?.['acae_auth'];
  if (fromCookie) return fromCookie;
  if (process.env.NODE_ENV !== 'production') {
    const authHeader = req?.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieOrBearer]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: string; role: string; tv?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, schoolId: true, tokenVersion: true, mustChangePassword: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    // Token revocado si tokenVersion no coincide (logout, cambio de contraseña)
    if (payload.tv !== undefined && user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Sesión inválida. Inicia sesión nuevamente.');
    }

    return user;
  }
}
