import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AgendamentosService } from './agendamentos.service';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private agendamentosService: AgendamentosService) {}

  @RequirePermissions('agendamentos:read')
  @Get()
  findAll(
    @Request() req: { user: { clinicaId: string; id: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agendamentosService.findAll(req.user.clinicaId, from, to);
  }

  @RequirePermissions('agendamentos:read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.agendamentosService.findOne(id, req.user.clinicaId);
  }

  @RequirePermissions('agendamentos:write')
  @Post()
  create(
    @Request() req: { user: { clinicaId: string; id: string } },
    @Body() body: CreateAgendamentoDto,
  ) {
    return this.agendamentosService.create(req.user.clinicaId, {
      pacienteId: body.pacienteId,
      usuarioId: body.usuarioId ?? req.user.id,
      data: body.data,
      tipo: body.tipo,
      status: body.status,
      observacoes: body.observacoes,
    });
  }

  @RequirePermissions('agendamentos:write')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
    @Body() body: UpdateAgendamentoDto,
  ) {
    return this.agendamentosService.update(id, req.user.clinicaId, body);
  }

  @RequirePermissions('agendamentos:write')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.agendamentosService.remove(id, req.user.clinicaId);
  }
}
