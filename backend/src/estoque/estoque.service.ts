import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstoqueService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicaId: string, search?: string) {
    return this.prisma.estoque.findMany({
      where: {
        clinicaId,
        ...(search?.trim()
          ? {
              medicamento: {
                OR: [
                  { nome: { contains: search.trim(), mode: 'insensitive' } },
                  { principioAtivo: { contains: search.trim(), mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        medicamento: { include: { variantes: true } },
      },
      orderBy: { medicamento: { nome: 'asc' } },
    });
  }

  async findOne(id: string, clinicaId: string) {
    const row = await this.prisma.estoque.findFirst({
      where: { id, clinicaId },
      include: { medicamento: true },
    });
    if (!row) throw new NotFoundException('Item de estoque não encontrado');
    return row;
  }

  private async assertMedicamento(medicamentoId: string) {
    const m = await this.prisma.medicamento.findFirst({
      where: { id: medicamentoId, ativo: true },
    });
    if (!m) throw new BadRequestException('Medicamento inválido ou inativo');
  }

  /** Inclui medicamento no estoque da clínica ou atualiza quantidade mínima / quantidade absoluta. */
  async upsertLinha(
    clinicaId: string,
    data: { medicamentoId: string; quantidade?: number; minimo?: number },
  ) {
    await this.assertMedicamento(data.medicamentoId);

    const existente = await this.prisma.estoque.findUnique({
      where: {
        clinicaId_medicamentoId: {
          clinicaId,
          medicamentoId: data.medicamentoId,
        },
      },
    });

    if (existente) {
      return this.prisma.estoque.update({
        where: { id: existente.id },
        data: {
          ...(data.quantidade !== undefined ? { quantidade: data.quantidade } : {}),
          ...(data.minimo !== undefined ? { minimo: data.minimo } : {}),
        },
        include: { medicamento: { include: { variantes: true } } },
      });
    }

    return this.prisma.estoque.create({
      data: {
        clinicaId,
        medicamentoId: data.medicamentoId,
        quantidade: data.quantidade ?? 0,
        minimo: data.minimo ?? 5,
      },
      include: { medicamento: { include: { variantes: true } } },
    });
  }

  async ajustar(
    id: string,
    clinicaId: string,
    data: { quantidade?: number; minimo?: number; delta?: number },
  ) {
    const row = await this.prisma.estoque.findFirst({
      where: { id, clinicaId },
    });
    if (!row) throw new NotFoundException('Item de estoque não encontrado');

    let q = row.quantidade;
    if (data.delta !== undefined) {
      q += data.delta;
      if (q < 0) throw new BadRequestException('Quantidade não pode ficar negativa');
    }
    if (data.quantidade !== undefined) q = data.quantidade;
    if (q < 0) throw new BadRequestException('Quantidade não pode ficar negativa');

    return this.prisma.estoque.update({
      where: { id },
      data: {
        quantidade: q,
        ...(data.minimo !== undefined ? { minimo: data.minimo } : {}),
      },
      include: { medicamento: { include: { variantes: true } } },
    });
  }

  async remove(id: string, clinicaId: string) {
    const row = await this.prisma.estoque.findFirst({ where: { id, clinicaId } });
    if (!row) throw new NotFoundException('Item de estoque não encontrado');
    await this.prisma.estoque.delete({ where: { id } });
    return { ok: true };
  }
}
