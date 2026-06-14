import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../auth/jwt-user';
import { ClinicasService } from './clinicas.service';

@UseGuards(AuthGuard('jwt'))
@Controller('clinicas')
export class ClinicasController {
  constructor(private clinicasService: ClinicasService) {}

  @Get()
  findAll(@Request() req: { user: JwtUser }) {
    return this.clinicasService.findAllForUser(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtUser }) {
    return this.clinicasService.findOne(id, req.user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(
    @Request() req: { user: JwtUser },
    @Body()
    body: {
      nome: string;
      cnpj?: string;
      telefone?: string;
      email?: string;
      endereco?: string;
    },
  ) {
    return this.clinicasService.create(body, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
    @Body()
    body: {
      nome?: string;
      cnpj?: string | null;
      telefone?: string | null;
      email?: string | null;
      endereco?: string | null;
      ativo?: boolean;
    },
  ) {
    return this.clinicasService.update(id, req.user, body);
  }
}
