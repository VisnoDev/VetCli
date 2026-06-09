import { Role } from '@prisma/client';

/**
 * Fonte única de verdade para autorização baseada em cargo.
 * Cada permissão segue o formato `recurso:ação`.
 * O frontend espelha esta matriz em `frontend/lib/permissions.ts`.
 */
export const PERMISSIONS = [
  'dashboard:view',
  'pacientes:read', 'pacientes:write',
  'tutores:read', 'tutores:write',
  'atendimentos:read', 'atendimentos:write',
  'prescricoes:read', 'prescricoes:write',
  'laboratorio:read', 'laboratorio:write',
  'vacinacoes:read', 'vacinacoes:write',
  'agendamentos:read', 'agendamentos:write',
  'estoque:read', 'estoque:write',
  'financeiro:read', 'financeiro:write',
  'usuarios:manage',
  'clinica:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const VETERINARIO: Permission[] = [
  'dashboard:view',
  'pacientes:read', 'pacientes:write',
  'tutores:read', 'tutores:write',
  'atendimentos:read', 'atendimentos:write',
  'prescricoes:read', 'prescricoes:write',
  'laboratorio:read', 'laboratorio:write',
  'vacinacoes:read', 'vacinacoes:write',
  'agendamentos:read', 'agendamentos:write',
  'estoque:read',
];

const RECEPCIONISTA: Permission[] = [
  'dashboard:view',
  'pacientes:read', 'pacientes:write',
  'tutores:read', 'tutores:write',
  'atendimentos:read',
  'agendamentos:read', 'agendamentos:write',
  'vacinacoes:read',
  'estoque:read',
  'financeiro:read', 'financeiro:write',
];

const BIOQUIMICO: Permission[] = [
  'dashboard:view',
  'laboratorio:read', 'laboratorio:write',
  'pacientes:read',
  'atendimentos:read',
  'vacinacoes:read',
];

export const PERMISSIONS_BY_ROLE: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS,
  VETERINARIO,
  RECEPCIONISTA,
  BIOQUIMICO,
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role]?.includes(perm) ?? false;
}
