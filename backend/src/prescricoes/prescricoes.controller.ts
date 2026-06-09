import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PrescricoesService } from './prescricoes.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('prescricoes')
export class PrescricoesController {
  constructor(private prescricoesService: PrescricoesService) {}

  @RequirePermissions('prescricoes:read')
  @Get()
  findAll(@Request() req: any) {
    return this.prescricoesService.findAll(req.user.clinicaId);
  }

  @RequirePermissions('prescricoes:read')
  @Get('medicamentos')
  getMedicamentos(@Query('search') search?: string) {
    return this.prescricoesService.getMedicamentos(search);
  }

  @RequirePermissions('prescricoes:read')
  @Get('interacoes')
  getInteracoes(@Query('ids') ids: string) {
    const medicamentoIds = ids ? ids.split(',') : [];
    return this.prescricoesService.getInteracoes(medicamentoIds);
  }

  @RequirePermissions('prescricoes:read')
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { clinicaId: string } }) {
    return this.prescricoesService.findOne(id, req.user.clinicaId);
  }

  @RequirePermissions('prescricoes:write')
  @Post()
  criar(@Request() req: any, @Body() body: any) {
    return this.prescricoesService.criar({
      ...body,
      usuarioId: req.user.id,
      clinicaId: req.user.clinicaId,
    });
  }
}
