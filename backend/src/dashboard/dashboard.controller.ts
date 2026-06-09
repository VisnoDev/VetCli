import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @RequirePermissions('dashboard:view')
  @Get('resumo')
  getResumo(
    @Request() req: any,
    @Query('clinicaId') clinicaIdParam?: string,
  ) {
    let clinicaId = req.user.clinicaId;
    if (req.user.role === 'SUPER_ADMIN' && clinicaIdParam?.trim()) {
      clinicaId = clinicaIdParam.trim();
    }
    return this.dashboardService.getResumo(clinicaId);
  }
}
