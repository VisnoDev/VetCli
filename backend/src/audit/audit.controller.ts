import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../auth/jwt-user';
import { AuditService } from './audit.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  listar(
    @Request() req: { user: JwtUser },
    @Query('acao') acao?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // ADMIN vê só a própria clínica; SUPER_ADMIN vê todas.
    const clinicaId = req.user.role === Role.SUPER_ADMIN ? undefined : req.user.clinicaId;
    return this.audit.listar({
      clinicaId,
      acao,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
