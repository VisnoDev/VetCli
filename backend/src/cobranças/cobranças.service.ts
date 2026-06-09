import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCobrancaDto } from './dto/create-cobranca.dto';
import { UpdateCobrancaDto } from './dto/update-cobranca.dto';

@Injectable()
export class CobrancasService {
  constructor(private prisma: PrismaService) {}

  async resumo(clinicaId: string) {
    const agora = new Date();
    const inicioHoje = new Date(agora);
    inicioHoje.setHours(0, 0, 0, 0);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [pagoHoje, pagoMes, pendentes] = await Promise.all([
      this.prisma.cobranca.aggregate({
        where: { clinicaId, status: 'PAGO', dataPagamento: { gte: inicioHoje } },
        _sum: { valor: true },
      }),
      this.prisma.cobranca.aggregate({
        where: { clinicaId, status: 'PAGO', dataPagamento: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      this.prisma.cobranca.aggregate({
        where: { clinicaId, status: 'PENDENTE' },
        _sum: { valor: true },
        _count: true,
      }),
    ]);

    return {
      receitaHoje: pagoHoje._sum.valor ?? 0,
      receitaMes: pagoMes._sum.valor ?? 0,
      totalPendente: pendentes._sum.valor ?? 0,
      qtdPendente: pendentes._count,
    };
  }

  async findAll(clinicaId: string, status?: string, page = 1, limit = 20) {
    const where = {
      clinicaId,
      ...(status ? { status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cobranca.findMany({
        where,
        include: {
          atendimento: {
            include: { paciente: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cobranca.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(clinicaId: string, dto: CreateCobrancaDto) {
    const { dataPagamento, atendimentoId, ...rest } = dto;
    return this.prisma.cobranca.create({
      data: {
        ...rest,
        clinicaId,
        ...(atendimentoId ? { atendimentoId } : {}),
        ...(dataPagamento ? { dataPagamento: new Date(dataPagamento) } : {}),
      },
      include: { atendimento: { include: { paciente: true } } },
    });
  }

  async update(id: string, clinicaId: string, dto: UpdateCobrancaDto) {
    const exists = await this.prisma.cobranca.findFirst({ where: { id, clinicaId } });
    if (!exists) throw new NotFoundException('Cobrança não encontrada');
    const { dataPagamento, ...rest } = dto;
    return this.prisma.cobranca.update({
      where: { id },
      data: {
        ...rest,
        ...(dataPagamento !== undefined
          ? { dataPagamento: dataPagamento ? new Date(dataPagamento) : null }
          : {}),
      },
      include: { atendimento: { include: { paciente: true } } },
    });
  }

  async remove(id: string, clinicaId: string) {
    const exists = await this.prisma.cobranca.findFirst({ where: { id, clinicaId } });
    if (!exists) throw new NotFoundException('Cobrança não encontrada');
    return this.prisma.cobranca.delete({ where: { id } });
  }
}
