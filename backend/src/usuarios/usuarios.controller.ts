import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { JwtUser } from '../auth/jwt-user';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateSenhaDto } from './dto/update-senha.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  listar(
    @Request() req: { user: JwtUser },
    @Query('clinicaId') clinicaIdParam?: string,
    @Query('incluirInativos') incluirInativos?: string,
  ) {
    let target = req.user.clinicaId;
    if (req.user.role === Role.SUPER_ADMIN && clinicaIdParam?.trim()) {
      target = clinicaIdParam.trim();
    }
    const incluir = incluirInativos === '1' || incluirInativos === 'true';
    return this.usuariosService.findByClinica(target, !incluir);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(
    @Request() req: { user: JwtUser },
    @Body() body: CreateUsuarioDto,
  ) {
    return this.usuariosService.create(req.user, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() body: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(req.user, id, body);
  }

  @Patch(':id/senha')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updateSenha(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() body: UpdateSenhaDto,
  ) {
    return this.usuariosService.updateSenha(req.user, id, body.senha);
  }
}
