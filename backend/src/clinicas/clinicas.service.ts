import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtUser } from '../auth/jwt-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClinicasService {
  constructor(private prisma: PrismaService) {}

  async findAllForUser(user: JwtUser) {
    if (user.role === Role.SUPER_ADMIN) {
      return this.prisma.clinica.findMany({
        orderBy: { nome: 'asc' },
      });
    }
    const c = await this.prisma.clinica.findUnique({
      where: { id: user.clinicaId },
    });
    return c ? [c] : [];
  }

  async findOne(id: string, user: JwtUser) {
    if (user.role !== Role.SUPER_ADMIN && id !== user.clinicaId) {
      throw new ForbiddenException('Sem permissão para esta clínica');
    }
    const c = await this.prisma.clinica.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Clínica não encontrada');
    return c;
  }

  async create(data: {
    nome: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
  }) {
    return this.prisma.clinica.create({
      data: {
        nome: data.nome,
        cnpj: data.cnpj || null,
        telefone: data.telefone || null,
        email: data.email || null,
        endereco: data.endereco || null,
      },
    });
  }

  async update(
    id: string,
    user: JwtUser,
    data: {
      nome?: string;
      cnpj?: string | null;
      telefone?: string | null;
      email?: string | null;
      endereco?: string | null;
      ativo?: boolean;
    },
  ) {
    const pode =
      user.role === Role.SUPER_ADMIN ||
      (user.role === Role.ADMIN && id === user.clinicaId);
    if (!pode) throw new ForbiddenException('Sem permissão para editar esta clínica');

    const existe = await this.prisma.clinica.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Clínica não encontrada');

    return this.prisma.clinica.update({
      where: { id },
      data,
    });
  }
}
