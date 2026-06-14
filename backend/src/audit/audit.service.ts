import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Ações sensíveis registradas no log de auditoria. */
export const AuditAction = {
  LOGIN_SUCESSO: 'LOGIN_SUCESSO',
  LOGIN_FALHA: 'LOGIN_FALHA',
  SENHA_ALTERADA: 'SENHA_ALTERADA',
  CLINICA_REGISTRADA: 'CLINICA_REGISTRADA',
  USUARIO_CRIADO: 'USUARIO_CRIADO',
  USUARIO_ATUALIZADO: 'USUARIO_ATUALIZADO',
  SENHA_REDEFINIDA: 'SENHA_REDEFINIDA',
  CLINICA_CRIADA: 'CLINICA_CRIADA',
  CLINICA_ATUALIZADA: 'CLINICA_ATUALIZADA',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

interface RegistrarInput {
  acao: AuditActionType;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  clinicaId?: string | null;
  entidade?: string;
  entidadeId?: string;
  ip?: string;
  detalhes?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra uma ação sensível. Fire-and-forget: nunca lança nem bloqueia
   * a requisição — uma falha de auditoria só é logada, não propaga.
   */
  registrar(input: RegistrarInput): void {
    this.prisma.auditLog
      .create({
        data: {
          acao: input.acao,
          usuarioId: input.usuarioId ?? null,
          usuarioEmail: input.usuarioEmail ?? null,
          clinicaId: input.clinicaId ?? null,
          entidade: input.entidade,
          entidadeId: input.entidadeId,
          ip: input.ip,
          detalhes: input.detalhes as any,
        },
      })
      .catch((e) => this.logger.error(`Falha ao registrar auditoria (${input.acao}): ${e}`));
  }

  /** Lista registros de auditoria. `clinicaId` undefined = todas (super admin). */
  async listar(params: { clinicaId?: string; acao?: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const where = {
      ...(params.clinicaId ? { clinicaId: params.clinicaId } : {}),
      ...(params.acao ? { acao: params.acao } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }
}
