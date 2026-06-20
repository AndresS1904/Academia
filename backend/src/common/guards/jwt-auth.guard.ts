import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Handlers que un SUPER_ADMIN con mustChangePassword=true puede seguir usando
// (cambiar su contraseña, ver su perfil, o cerrar sesión).
const ALLOWED_WHILE_MUST_CHANGE_PASSWORD = new Set(['setNewPassword', 'getProfile', 'logout']);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const can = await super.canActivate(context);
    if (!can) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Bloquea el acceso normal del SUPER_ADMIN hasta que complete el cambio de contraseña obligatorio
    if (user?.role === 'SUPER_ADMIN' && user?.mustChangePassword) {
      const handlerName = context.getHandler().name;
      if (!ALLOWED_WHILE_MUST_CHANGE_PASSWORD.has(handlerName)) {
        throw new ForbiddenException('Debes cambiar tu contraseña antes de continuar');
      }
    }

    return true;
  }
}
