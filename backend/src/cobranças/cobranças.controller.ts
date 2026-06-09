import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CobrancasService } from './cobranças.service';
import { CreateCobrancaDto } from './dto/create-cobranca.dto';
import { UpdateCobrancaDto } from './dto/update-cobranca.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('cobrancas')
export class CobrancasController {
  constructor(private cobrancasService: CobrancasService) {}

  @RequirePermissions('financeiro:read')
  @Get('resumo')
  resumo(@Request() req: { user: { clinicaId: string } }) {
    return this.cobrancasService.resumo(req.user.clinicaId);
  }

  @RequirePermissions('financeiro:read')
  @Get()
  findAll(
    @Request() req: { user: { clinicaId: string } },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cobrancasService.findAll(
      req.user.clinicaId,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @RequirePermissions('financeiro:write')
  @Post()
  create(
    @Request() req: { user: { clinicaId: string } },
    @Body() dto: CreateCobrancaDto,
  ) {
    return this.cobrancasService.create(req.user.clinicaId, dto);
  }

  @RequirePermissions('financeiro:write')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
    @Body() dto: UpdateCobrancaDto,
  ) {
    return this.cobrancasService.update(id, req.user.clinicaId, dto);
  }

  @RequirePermissions('financeiro:write')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.cobrancasService.remove(id, req.user.clinicaId);
  }
}
