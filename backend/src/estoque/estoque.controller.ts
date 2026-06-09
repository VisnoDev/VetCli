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
import { EstoqueService } from './estoque.service';
import { UpsertEstoqueDto } from './dto/upsert-estoque.dto';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('estoque')
export class EstoqueController {
  constructor(private estoqueService: EstoqueService) {}

  @RequirePermissions('estoque:read')
  @Get()
  findAll(
    @Request() req: { user: { clinicaId: string } },
    @Query('search') search?: string,
  ) {
    return this.estoqueService.findAll(req.user.clinicaId, search);
  }

  @RequirePermissions('estoque:read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.estoqueService.findOne(id, req.user.clinicaId);
  }

  /** Inclui medicamento no estoque ou atualiza linha existente (quantidade/minimo absolutos). */
  @RequirePermissions('estoque:write')
  @Post()
  upsert(
    @Request() req: { user: { clinicaId: string } },
    @Body() body: UpsertEstoqueDto,
  ) {
    return this.estoqueService.upsertLinha(req.user.clinicaId, body);
  }

  @RequirePermissions('estoque:write')
  @Patch(':id')
  ajustar(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
    @Body() body: AjustarEstoqueDto,
  ) {
    return this.estoqueService.ajustar(id, req.user.clinicaId, body);
  }

  @RequirePermissions('estoque:write')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { clinicaId: string } },
  ) {
    return this.estoqueService.remove(id, req.user.clinicaId);
  }
}
