import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { Permission, hasPermission } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: { role: Role } }>();
    const role = req.user?.role;
    if (!role) throw new ForbiddenException('Não autenticado');

    const ok = required.every((perm) => hasPermission(role, perm));
    if (!ok) {
      throw new ForbiddenException('Você não tem permissão para esta ação');
    }
    return true;
  }
}
