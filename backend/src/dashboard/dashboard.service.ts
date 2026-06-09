import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getResumo(clinicaId: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const [
      totalPacientes,
      agendamentosHoje,
      totalPrescricoes,
      itensEstoque,
      todosEstoque,
      ultimosAtendimentos,
      proximosAgendamentos,
      receitaHoje,
      receitaMes,
      pendentes,
    ] = await Promise.all([
      this.prisma.paciente.count({ where: { clinicaId } }),
      this.prisma.agendamento.count({
        where: { clinicaId, data: { gte: hoje, lt: amanha } },
      }),
      this.prisma.atendimento.count({ where: { clinicaId } }),
      this.prisma.estoque.count({ where: { clinicaId } }),
      this.prisma.estoque.findMany({ where: { clinicaId } }),
      this.prisma.atendimento.findMany({
        where: { clinicaId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          paciente: { include: { tutor: true } },
          usuario: true,
        },
      }),
      this.prisma.agendamento.findMany({
        where: { clinicaId, data: { gte: hoje } },
        orderBy: { data: 'asc' },
        take: 5,
        include: {
          paciente: { include: { tutor: true } },
          usuario: true,
        },
      }),
      this.prisma.cobranca.aggregate({
        where: { clinicaId, status: 'PAGO', dataPagamento: { gte: hoje, lt: amanha } },
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

    const estoqueAbaixoMinimo = todosEstoque.filter(
      (e) => e.quantidade <= e.minimo,
    ).length;

    return {
      totalPacientes,
      agendamentosHoje,
      totalPrescricoes,
      itensEstoque,
      estoqueAbaixoMinimo,
      ultimosAtendimentos,
      proximosAgendamentos,
      receitaHoje: receitaHoje._sum.valor ?? 0,
      receitaMes: receitaMes._sum.valor ?? 0,
      totalPendente: pendentes._sum.valor ?? 0,
      qtdPendente: pendentes._count,
    };
  }
}
