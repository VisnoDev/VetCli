import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { VacinacoesService } from './vacinacoes.service';
import { CreateVacinacaoDto } from './dto/create-vacinacao.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('vacinacoes')
export class VacinacoesController {
  constructor(private vacinacoesService: VacinacoesService) {}

  @RequirePermissions('vacinacoes:read')
  @Get('paciente/:pacienteId')
  findByPaciente(@Request() req: any, @Param('pacienteId') pacienteId: string) {
    return this.vacinacoesService.findByPaciente(pacienteId, req.user.clinicaId);
  }

  @RequirePermissions('vacinacoes:write')
  @Post()
  create(@Request() req: any, @Body() body: CreateVacinacaoDto) {
    return this.vacinacoesService.create(req.user.clinicaId, req.user.id, body);
  }

  @RequirePermissions('vacinacoes:write')
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.vacinacoesService.remove(id, req.user.clinicaId);
  }
}
