import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacientesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicaId: string, search?: string, page = 1, limit = 20) {
    const where = {
      clinicaId,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' as const } },
              { especie: { contains: search, mode: 'insensitive' as const } },
              { raca: { contains: search, mode: 'insensitive' as const } },
              { tutor: { nome: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.paciente.findMany({
        where,
        include: { tutor: true },
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paciente.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, clinicaId: string) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { id, clinicaId },
      include: {
        tutor: true,
        atendimentos: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!paciente) throw new NotFoundException('Paciente não encontrado');
    return paciente;
  }

  async create(data: {
    nome: string;
    especie: string;
    raca?: string;
    sexo?: string;
    peso?: number;
    dataNasc?: string;
    tutorId: string;
    clinicaId: string;
  }) {
    return this.prisma.paciente.create({
      data: {
        ...data,
        dataNasc: data.dataNasc ? new Date(data.dataNasc) : undefined,
      },
      include: { tutor: true },
    });
  }

  async update(id: string, clinicaId: string, data: any) {
    const existing = await this.prisma.paciente.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.paciente.update({
      where: { id },
      data: {
        ...data,
        dataNasc: data.dataNasc ? new Date(data.dataNasc) : undefined,
      },
      include: { tutor: true },
    });
  }

  async getHistorico(id: string, clinicaId: string) {
    const paciente = await this.prisma.paciente.findFirst({ where: { id, clinicaId } });
    if (!paciente) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.atendimento.findMany({
      where: { pacienteId: id, clinicaId },
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: true,
        prescricoes: {
          include: {
            itens: { include: { medicamento: true } },
          },
        },
      },
    });
  }

  async remove(id: string, clinicaId: string) {
    const existing = await this.prisma.paciente.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new NotFoundException('Paciente não encontrado');
    return this.prisma.paciente.delete({ where: { id } });
  }
}
