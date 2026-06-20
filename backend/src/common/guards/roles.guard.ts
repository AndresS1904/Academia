import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Jerarquía de roles (de mayor a menor):
 *   SUPER_ADMIN > ADMIN > ESTUDIANTE
 *
 * SUPER_ADMIN pasa cualquier guard que requiera ADMIN.
 * ADMIN pasa cualquier guard que requiera ADMIN.
 * ESTUDIANTE solo pasa guards sin @Roles o con @Roles(ESTUDIANTE).
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 3,
  [Role.ADMIN]: 2,
  [Role.ESTUDIANTE]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles → permite cualquier usuario autenticado
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) return false;

    const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;

    // El usuario pasa si su nivel es >= al mínimo requerido
    const minRequired = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 0));
    return userLevel >= minRequired;
  }
}
