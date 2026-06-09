import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('pacientes')
export class PacientesController {
  constructor(private pacientesService: PacientesService) {}

  @RequirePermissions('pacientes:read')
  @Get()
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pacientesService.findAll(
      req.user.clinicaId,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @RequirePermissions('pacientes:read')
  @Get(':id/historico')
  getHistorico(@Request() req: any, @Param('id') id: string) {
    return this.pacientesService.getHistorico(id, req.user.clinicaId);
  }

  @RequirePermissions('pacientes:read')
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.pacientesService.findOne(id, req.user.clinicaId);
  }

  @RequirePermissions('pacientes:write')
  @Post()
  create(@Request() req: any, @Body() body: CreatePacienteDto) {
    return this.pacientesService.create({
      ...body,
      clinicaId: req.user.clinicaId,
    });
  }

  @RequirePermissions('pacientes:write')
  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: UpdatePacienteDto) {
    return this.pacientesService.update(id, req.user.clinicaId, body);
  }

  @RequirePermissions('pacientes:write')
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.pacientesService.remove(id, req.user.clinicaId);
  }
}
