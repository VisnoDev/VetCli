/**
 * Espelho da matriz de permissões do backend (backend/src/common/permissions.ts).
 * Usado para esconder menus, botões e bloquear rotas conforme o cargo.
 * IMPORTANTE: isto é só UX — a autorização real é feita no backend.
 */

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VETERINARIO' | 'RECEPCIONISTA' | 'BIOQUIMICO';

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

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS_BY_ROLE[role]?.includes(perm) ?? false;
}

/** Lê o cargo do usuário salvo no localStorage. */
export function getStoredRole(): Role | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('usuario');
    if (!raw) return null;
    return (JSON.parse(raw).role as Role) ?? null;
  } catch {
    return null;
  }
}
