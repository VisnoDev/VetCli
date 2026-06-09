import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtUser } from '../auth/jwt-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
    });
  }

  /** @param apenasAtivos se true, só usuários ativos (ex.: select na agenda) */
  async findByClinica(clinicaId: string, apenasAtivos = true) {
    return this.prisma.usuario.findMany({
      where: {
        clinicaId,
        ...(apenasAtivos ? { ativo: true } : {}),
      },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async create(
    actor: JwtUser,
    data: {
      nome: string;
      email: string;
      senha: string;
      role: Role;
      clinicaId?: string;
    },
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Sem permissão para criar usuários');
    }

    let clinicaId = actor.clinicaId;
    if (actor.role === Role.SUPER_ADMIN && data.clinicaId) {
      clinicaId = data.clinicaId;
    }

    if (actor.role === Role.ADMIN && data.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Apenas super admin pode criar outro super admin');
    }

    const clinica = await this.prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) throw new BadRequestException('Clínica inválida');

    const exists = await this.prisma.usuario.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (exists) throw new BadRequestException('Este e-mail já está cadastrado');

    const senha = await bcrypt.hash(data.senha, 10);
    return this.prisma.usuario.create({
      data: {
        nome: data.nome.trim(),
        email: data.email.toLowerCase().trim(),
        senha,
        role: data.role,
        clinicaId,
      },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
  }

  async update(
    actor: JwtUser,
    id: string,
    data: { nome?: string; role?: Role; ativo?: boolean },
  ) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (actor.role !== Role.SUPER_ADMIN && user.clinicaId !== actor.clinicaId) {
      throw new ForbiddenException('Sem permissão');
    }

    if (actor.role === Role.ADMIN && data.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Sem permissão para definir este papel');
    }

    if (
      data.role === Role.SUPER_ADMIN &&
      actor.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Sem permissão');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
  }

  async updateSenha(actor: JwtUser, id: string, novaSenha: string) {
    if (novaSenha.length < 6) {
      throw new BadRequestException('Senha deve ter pelo menos 6 caracteres');
    }
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (actor.role !== Role.SUPER_ADMIN && user.clinicaId !== actor.clinicaId) {
      throw new ForbiddenException('Sem permissão');
    }

    const senha = await bcrypt.hash(novaSenha, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { senha },
    });
    return { ok: true };
  }
}
