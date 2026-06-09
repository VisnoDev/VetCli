import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LaboratorioService {
  constructor(private prisma: PrismaService) {}

  async criarSolicitacao(data: {
    atendimentoId: string;
    clinicaId: string;
    observacoes?: string;
    itens: { categoriaExame: string; nomeExame: string }[];
  }) {
    const numero = `LAB-${Date.now()}`;
    return this.prisma.solicitacaoExame.create({
      data: {
        atendimentoId: data.atendimentoId,
        clinicaId: data.clinicaId,
        numero,
        observacoes: data.observacoes,
        itens: { create: data.itens },
      },
      include: {
        itens: true,
        atendimento: {
          include: { paciente: { include: { tutor: true } } },
        },
      },
    });
  }

  async findAll(clinicaId: string, status?: string) {
    return this.prisma.solicitacaoExame.findMany({
      where: { clinicaId, ...(status ? { status: status as any } : {}) },
      include: {
        itens: { include: { responsavel: true } },
        atendimento: {
          include: { paciente: { include: { tutor: true } }, usuario: true },
        },
        etapas: { include: { usuario: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, clinicaId: string) {
    const solicitacao = await this.prisma.solicitacaoExame.findFirst({
      where: { id, clinicaId },
      include: {
        itens: { include: { responsavel: true } },
        atendimento: {
          include: { paciente: { include: { tutor: true } }, usuario: true },
        },
        etapas: { include: { usuario: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação não encontrada');
    return solicitacao;
  }

  async findByPaciente(pacienteId: string, clinicaId: string) {
    return this.prisma.solicitacaoExame.findMany({
      where: { clinicaId, atendimento: { pacienteId } },
      include: {
        itens: true,
        atendimento: { include: { usuario: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async atualizarStatus(id: string, clinicaId: string, status: string) {
    const existing = await this.prisma.solicitacaoExame.findFirst({ where: { id, clinicaId } });
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    return this.prisma.solicitacaoExame.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async lancarResultado(itemId: string, clinicaId: string, data: {
    resultado: string;
    valorReferencia?: string;
    unidade?: string;
    observacao?: string;
    responsavelId: string;
  }) {
    const item = await this.prisma.itemSolicitacao.findFirst({
      where: { id: itemId, solicitacao: { clinicaId } },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return this.prisma.itemSolicitacao.update({
      where: { id: itemId },
      data: {
        resultado: data.resultado,
        valorReferencia: data.valorReferencia,
        unidade: data.unidade,
        observacao: data.observacao,
        responsavelId: data.responsavelId,
        dataLiberacao: new Date(),
        status: 'LIBERADO',
      },
    });
  }

  async iniciarEtapa(data: {
    solicitacaoId: string;
    clinicaId: string;
    nome: string;
    duracaoSegundos: number;
    usuarioId: string;
    observacao?: string;
  }) {
    const solicitacao = await this.prisma.solicitacaoExame.findFirst({
      where: { id: data.solicitacaoId, clinicaId: data.clinicaId },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação não encontrada');
    return this.prisma.etapaProcessamento.create({
      data: {
        solicitacaoId: data.solicitacaoId,
        nome: data.nome,
        duracaoSegundos: data.duracaoSegundos,
        iniciadoEm: new Date(),
        usuarioId: data.usuarioId,
        observacao: data.observacao,
      },
    });
  }

  async concluirEtapa(etapaId: string, clinicaId: string) {
    const etapa = await this.prisma.etapaProcessamento.findFirst({
      where: { id: etapaId, solicitacao: { clinicaId } },
    });
    if (!etapa) throw new NotFoundException('Etapa não encontrada');
    return this.prisma.etapaProcessamento.update({
      where: { id: etapaId },
      data: { concluidoEm: new Date() },
    });
  }

  async getFilaTrabalho(clinicaId: string) {
    return this.prisma.solicitacaoExame.findMany({
      where: {
        clinicaId,
        status: {
          in: ['SOLICITADO', 'AMOSTRA_COLETADA', 'EM_PROCESSAMENTO', 'AGUARDANDO_VALIDACAO'],
        },
      },
      include: {
        itens: true,
        atendimento: {
          include: { paciente: { include: { tutor: true } }, usuario: true },
        },
        etapas: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
