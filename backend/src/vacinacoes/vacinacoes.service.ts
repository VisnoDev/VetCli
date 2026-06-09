import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVacinacaoDto } from './dto/create-vacinacao.dto';

@Injectable()
export class VacinacoesService {
  constructor(private prisma: PrismaService) {}

  findByPaciente(pacienteId: string, clinicaId: string) {
    return this.prisma.vacinacao.findMany({
      where: { pacienteId, clinicaId },
      include: { usuario: { select: { id: true, nome: true } } },
      orderBy: { dataAplicacao: 'desc' },
    });
  }

  create(clinicaId: string, usuarioId: string, data: CreateVacinacaoDto) {
    return this.prisma.vacinacao.create({
      data: {
        ...data,
        clinicaId,
        usuarioId,
        dataAplicacao: new Date(data.dataAplicacao),
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
      },
      include: { usuario: { select: { id: true, nome: true } } },
    });
  }

  async remove(id: string, clinicaId: string) {
    const existing = await this.prisma.vacinacao.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new NotFoundException('Vacinação não encontrada');
    return this.prisma.vacinacao.delete({ where: { id } });
  }
}
