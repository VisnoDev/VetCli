import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LaboratorioService } from './laboratorio.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AtualizarStatusDto } from './dto/atualizar-status.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('laboratorio')
export class LaboratorioController {
  constructor(private laboratorioService: LaboratorioService) {}

  @RequirePermissions('laboratorio:read')
  @Get()
  findAll(@Request() req: any, @Query('status') status?: string) {
    return this.laboratorioService.findAll(req.user.clinicaId, status);
  }

  @RequirePermissions('laboratorio:read')
  @Get('fila')
  getFila(@Request() req: any) {
    return this.laboratorioService.getFilaTrabalho(req.user.clinicaId);
  }

  @RequirePermissions('laboratorio:read')
  @Get('paciente/:pacienteId')
  findByPaciente(@Request() req: any, @Param('pacienteId') pacienteId: string) {
    return this.laboratorioService.findByPaciente(pacienteId, req.user.clinicaId);
  }

  @RequirePermissions('laboratorio:read')
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.laboratorioService.findOne(id, req.user.clinicaId);
  }

  @RequirePermissions('laboratorio:write')
  @Post()
  criar(@Request() req: any, @Body() body: any) {
    return this.laboratorioService.criarSolicitacao({
      ...body,
      clinicaId: req.user.clinicaId,
    });
  }

  @RequirePermissions('laboratorio:write')
  @Patch(':id/status')
  atualizarStatus(@Request() req: any, @Param('id') id: string, @Body() body: AtualizarStatusDto) {
    return this.laboratorioService.atualizarStatus(id, req.user.clinicaId, body.status);
  }

  @RequirePermissions('laboratorio:write')
  @Patch('item/:itemId/resultado')
  lancarResultado(@Request() req: any, @Param('itemId') itemId: string, @Body() body: any) {
    return this.laboratorioService.lancarResultado(itemId, req.user.clinicaId, {
      ...body,
      responsavelId: req.user.id,
    });
  }

  @RequirePermissions('laboratorio:write')
  @Post('etapa')
  iniciarEtapa(@Request() req: any, @Body() body: any) {
    return this.laboratorioService.iniciarEtapa({
      ...body,
      clinicaId: req.user.clinicaId,
      usuarioId: req.user.id,
    });
  }

  @RequirePermissions('laboratorio:write')
  @Patch('etapa/:etapaId/concluir')
  concluirEtapa(@Request() req: any, @Param('etapaId') etapaId: string) {
    return this.laboratorioService.concluirEtapa(etapaId, req.user.clinicaId);
  }
}
