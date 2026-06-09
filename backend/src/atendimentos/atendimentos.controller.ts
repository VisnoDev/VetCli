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
import { AtendimentosService } from './atendimentos.service';
import { CreateAtendimentoDto } from './dto/create-atendimento.dto';
import { UpdateAtendimentoDto } from './dto/update-atendimento.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('atendimentos')
export class AtendimentosController {
  constructor(private atendimentosService: AtendimentosService) {}

  @RequirePermissions('atendimentos:read')
  @Get()
  findAll(
    @Request() req: { user: { clinicaId: string } },
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.atendimentosService.findAll(
      req.user.clinicaId,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @RequirePermissions('atendimentos:read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.atendimentosService.findOne(id, req.user.clinicaId);
  }

  @RequirePermissions('atendimentos:write')
  @Post()
  create(
    @Request() req: { user: { clinicaId: string; id: string } },
    @Body() body: CreateAtendimentoDto,
  ) {
    return this.atendimentosService.create({
      ...body,
      usuarioId: req.user.id,
      clinicaId: req.user.clinicaId,
    });
  }

  @RequirePermissions('atendimentos:write')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
    @Body() body: UpdateAtendimentoDto,
  ) {
    return this.atendimentosService.update(id, req.user.clinicaId, body);
  }

  @RequirePermissions('atendimentos:write')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.atendimentosService.remove(id, req.user.clinicaId);
  }
}
