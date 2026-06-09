import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgendamentosService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicaId: string, from?: string, to?: string) {
    const where: {
      clinicaId: string;
      data?: { gte?: Date; lte?: Date };
    } = { clinicaId };

    if (from?.trim() || to?.trim()) {
      where.data = {};
      if (from?.trim()) where.data.gte = new Date(from);
      if (to?.trim()) where.data.lte = new Date(to);
    }

    return this.prisma.agendamento.findMany({
      where,
      include: {
        paciente: { include: { tutor: true } },
        usuario: { select: { id: true, nome: true, role: true } },
      },
      orderBy: { data: 'asc' },
    });
  }

  async findOne(id: string, clinicaId: string) {
    const row = await this.prisma.agendamento.findFirst({
      where: { id, clinicaId },
      include: {
        paciente: { include: { tutor: true } },
        usuario: { select: { id: true, nome: true, role: true } },
      },
    });
    if (!row) throw new NotFoundException('Agendamento não encontrado');
    return row;
  }

  private async assertPacienteDaClinica(pacienteId: string, clinicaId: string) {
    const p = await this.prisma.paciente.findFirst({
      where: { id: pacienteId, clinicaId },
    });
    if (!p) throw new BadRequestException('Paciente inválido ou de outra clínica');
  }

  private async assertUsuarioDaClinica(usuarioId: string, clinicaId: string) {
    const u = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, clinicaId, ativo: true },
    });
    if (!u) throw new BadRequestException('Profissional inválido ou inativo');
  }

  async create(
    clinicaId: string,
    data: {
      pacienteId: string;
      usuarioId: string;
      data: string;
      tipo?: string;
      status?: string;
      observacoes?: string;
    },
  ) {
    await this.assertPacienteDaClinica(data.pacienteId, clinicaId);
    await this.assertUsuarioDaClinica(data.usuarioId, clinicaId);

    const when = new Date(data.data);
    if (Number.isNaN(when.getTime())) {
      throw new BadRequestException('Data/hora inválida');
    }

    return this.prisma.agendamento.create({
      data: {
        pacienteId: data.pacienteId,
        usuarioId: data.usuarioId,
        clinicaId,
        data: when,
        tipo: data.tipo,
        status: data.status ?? 'AGENDADO',
        observacoes: data.observacoes,
      },
      include: {
        paciente: { include: { tutor: true } },
        usuario: { select: { id: true, nome: true, role: true } },
      },
    });
  }

  async update(
    id: string,
    clinicaId: string,
    data: {
      pacienteId?: string;
      usuarioId?: string;
      data?: string;
      tipo?: string;
      status?: string;
      observacoes?: string | null;
    },
  ) {
    const existing = await this.prisma.agendamento.findFirst({
      where: { id, clinicaId },
    });
    if (!existing) throw new NotFoundException('Agendamento não encontrado');

    if (data.pacienteId && data.pacienteId !== existing.pacienteId) {
      await this.assertPacienteDaClinica(data.pacienteId, clinicaId);
    }
    if (data.usuarioId && data.usuarioId !== existing.usuarioId) {
      await this.assertUsuarioDaClinica(data.usuarioId, clinicaId);
    }

    let dataHora: Date | undefined;
    if (data.data !== undefined) {
      dataHora = new Date(data.data);
      if (Number.isNaN(dataHora.getTime())) {
        throw new BadRequestException('Data/hora inválida');
      }
    }

    return this.prisma.agendamento.update({
      where: { id },
      data: {
        ...(data.pacienteId !== undefined ? { pacienteId: data.pacienteId } : {}),
        ...(data.usuarioId !== undefined ? { usuarioId: data.usuarioId } : {}),
        ...(dataHora !== undefined ? { data: dataHora } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
      },
      include: {
        paciente: { include: { tutor: true } },
        usuario: { select: { id: true, nome: true, role: true } },
      },
    });
  }

  async remove(id: string, clinicaId: string) {
    const existing = await this.prisma.agendamento.findFirst({
      where: { id, clinicaId },
    });
    if (!existing) throw new NotFoundException('Agendamento não encontrado');
    await this.prisma.agendamento.delete({ where: { id } });
    return { ok: true };
  }
}
