import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TutoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicaId: string, search?: string) {
    return this.prisma.tutor.findMany({
      where: {
        clinicaId,
        ...(search
          ? {
              OR: [
                { nome: { contains: search, mode: 'insensitive' } },
                { cpf: { contains: search } },
                { telefone: { contains: search } },
              ],
            }
          : {}),
      },
      include: { pacientes: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string, clinicaId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id, clinicaId },
      include: { pacientes: true },
    });
    if (!tutor) throw new NotFoundException('Tutor não encontrado');
    return tutor;
  }

  async create(clinicaId: string, data: {
    nome: string;
    cpf?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
  }) {
    return this.prisma.tutor.create({ data: { ...data, clinicaId } });
  }

  async update(id: string, clinicaId: string, data: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
  }) {
    const existing = await this.prisma.tutor.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new NotFoundException('Tutor não encontrado');
    return this.prisma.tutor.update({ where: { id }, data });
  }

  async remove(id: string, clinicaId: string) {
    const existing = await this.prisma.tutor.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new NotFoundException('Tutor não encontrado');
    return this.prisma.tutor.delete({ where: { id } });
  }
}
