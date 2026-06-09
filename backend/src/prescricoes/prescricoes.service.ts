import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrescricoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicaId: string) {
    return this.prisma.atendimento.findMany({
      where: { clinicaId },
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, clinicaId: string) {
    const row = await this.prisma.atendimento.findFirst({
      where: { id, clinicaId },
      include: {
        clinica: true,
        paciente: { include: { tutor: true } },
        usuario: true,
        prescricoes: {
          include: {
            itens: {
              include: { medicamento: { include: { variantes: true } }, variante: true },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Atendimento não encontrado');
    return row;
  }

  async criar(data: {
    pacienteId: string;
    usuarioId: string;
    clinicaId: string;
    queixa?: string;
    diagnostico?: string;
    observacoes?: string;
    itens: {
      medicamentoId: string;
      medicamentoVarianteId?: string | null;
      dosagem?: string;
      frequencia?: string;
      duracao?: string;
      instrucoes?: string;
    }[];
  }) {
    return this.prisma.atendimento.create({
      data: {
        pacienteId: data.pacienteId,
        usuarioId: data.usuarioId,
        clinicaId: data.clinicaId,
        queixa: data.queixa,
        diagnostico: data.diagnostico,
        observacoes: data.observacoes,
        prescricoes: {
          create: {
            itens: {
              create: data.itens.map((i) => ({
                medicamentoId: i.medicamentoId,
                medicamentoVarianteId: i.medicamentoVarianteId || null,
                dosagem: i.dosagem,
                frequencia: i.frequencia,
                duracao: i.duracao,
                instrucoes: i.instrucoes,
              })),
            },
          },
        },
      },
      include: {
        paciente: { include: { tutor: true } },
        prescricoes: {
          include: {
            itens: {
              include: { medicamento: true, variante: true },
            },
          },
        },
      },
    });
  }

  async getMedicamentos(search?: string) {
    const q = search?.trim();
    return this.prisma.medicamento.findMany({
      where: {
        ativo: true,
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: 'insensitive' } },
                { principioAtivo: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { variantes: true },
      orderBy: { nome: 'asc' },
    });
  }

  async getInteracoes(medicamentoIds: string[]) {
    return this.prisma.interacaoMedicamentosa.findMany({
      where: {
        OR: [
          {
            medicamentoAId: { in: medicamentoIds },
            medicamentoBId: { in: medicamentoIds },
          },
        ],
      },
      include: {
        medicamentoA: true,
        medicamentoB: true,
      },
    });
  }
}
