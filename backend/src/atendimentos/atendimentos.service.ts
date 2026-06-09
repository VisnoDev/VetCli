import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AtendimentosService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicaId: string, search?: string, page = 1, limit = 20) {
    const where = {
      clinicaId,
      ...(search
        ? {
            OR: [
              { paciente: { nome: { contains: search, mode: 'insensitive' as const } } },
              { diagnostico: { contains: search, mode: 'insensitive' as const } },
              { queixa: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.atendimento.findMany({
        where,
        include: {
          paciente: { include: { tutor: true } },
          usuario: true,
          _count: { select: { prescricoes: true, solicitacoesExame: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.atendimento.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, clinicaId: string) {
    const atendimento = await this.prisma.atendimento.findFirst({
      where: { id, clinicaId },
      include: {
        paciente: { include: { tutor: true } },
        usuario: true,
        prescricoes: {
          include: {
            itens: {
              include: { medicamento: true, variante: true },
            },
          },
        },
        solicitacoesExame: {
          include: {
            itens: true,
            etapas: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!atendimento) throw new NotFoundException('Atendimento não encontrado');
    return atendimento;
  }

  async create(data: {
    pacienteId: string;
    usuarioId: string;
    clinicaId: string;
    queixa?: string;
    diagnostico?: string;
    observacoes?: string;
  }) {
    return this.prisma.atendimento.create({
      data,
      include: {
        paciente: { include: { tutor: true } },
        usuario: true,
      },
    });
  }

  async update(
    id: string,
    clinicaId: string,
    data: { queixa?: string; diagnostico?: string; observacoes?: string },
  ) {
    const exists = await this.prisma.atendimento.findFirst({ where: { id, clinicaId } });
    if (!exists) throw new NotFoundException('Atendimento não encontrado');
    return this.prisma.atendimento.update({
      where: { id },
      data,
      include: {
        paciente: { include: { tutor: true } },
        usuario: true,
      },
    });
  }

  async remove(id: string, clinicaId: string) {
    const exists = await this.prisma.atendimento.findFirst({ where: { id, clinicaId } });
    if (!exists) throw new NotFoundException('Atendimento não encontrado');
    return this.prisma.atendimento.delete({ where: { id } });
  }
}
