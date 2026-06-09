'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useTheme } from 'next-themes';
import { can, type Permission, type Role } from '@/lib/permissions';
import {
  LayoutDashboard, Heart, Users, ClipboardList, FileText,
  TestTube, Package, Calendar, Settings, Banknote, PawPrint,
  Sun, Moon, LogOut, Menu, X,
} from 'lucide-react';

type MenuItem = { icon: React.ElementType; label: string; href: string; perm?: Permission };
type MenuGroup = { label: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    label: 'Clínica',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', perm: 'dashboard:view' },
      { icon: Heart, label: 'Pacientes', href: '/pacientes', perm: 'pacientes:read' },
      { icon: Users, label: 'Tutores', href: '/tutores', perm: 'tutores:read' },
      { icon: ClipboardList, label: 'Atendimentos', href: '/atendimentos', perm: 'atendimentos:read' },
      { icon: FileText, label: 'Prescrições', href: '/prescricoes', perm: 'prescricoes:read' },
      { icon: TestTube, label: 'Laboratório', href: '/laboratorio', perm: 'laboratorio:read' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { icon: Banknote, label: 'Financeiro', href: '/financeiro', perm: 'financeiro:read' },
      { icon: Package, label: 'Estoque', href: '/estoque', perm: 'estoque:read' },
      { icon: Calendar, label: 'Agenda', href: '/agenda', perm: 'agendamentos:read' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Settings, label: 'Configurações', href: '/configuracoes' },
    ],
  },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super admin', ADMIN: 'Administrador', VETERINARIO: 'Veterinário',
  RECEPCIONISTA: 'Recepcionista', BIOQUIMICO: 'Bioquímico',
};

export default function AutenticadoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<{ nome: string; role: Role } | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  useEffect(() => {
    setMounted(true);
    api.get('/auth/me')
      .then((res) => setUsuario({ nome: res.data.nome, role: res.data.role }))
      .catch(() => {
        localStorage.removeItem('usuario');
        router.push('/login');
      });
  }, [router]);

  // Bloqueio de rota: se o cargo não tem permissão para a página atual, volta ao dashboard.
  useEffect(() => {
    if (!usuario) return;
    const item = menuGroups
      .flatMap((g) => g.items)
      .find((i) => pathname === i.href || pathname.startsWith(i.href + '/'));
    if (item?.perm && !can(usuario.role, item.perm)) {
      router.replace('/dashboard');
    }
  }, [usuario, pathname, router]);

  const gruposVisiveis = useMemo(() => {
    if (!usuario) return [];
    return menuGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(usuario.role, i.perm)) }))
      .filter((g) => g.items.length > 0);
  }, [usuario]);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('usuario');
      router.push('/login');
    }
  }

  const iniciais = usuario?.nome
    ? usuario.nome.trim().split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?';

  const tituloPagina =
    menuGroups.flatMap((g) => g.items).find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label
    ?? 'VetCli';

  return (
    <div className="min-h-screen flex">
      {/* Overlay mobile */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-[260px] flex flex-col z-50
          bg-gradient-to-b from-[#0b201d] via-[#0a1a18] to-[#070a0c]
          transition-transform duration-300 ease-out
          ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:flex-shrink-0
        `}
      >
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-brand-500/40 via-brand-500/5 to-transparent" />

        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-[68px] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/40">
              <PawPrint size={19} className="text-white" />
            </div>
            <div className="leading-none">
              <span className="font-display text-white font-extrabold text-lg tracking-tight">VetCli</span>
              <p className="text-[10px] text-brand-300/70 font-medium mt-0.5 tracking-wide">GESTÃO VETERINÁRIA</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarAberta(false)}
            className="lg:hidden text-white/50 hover:text-white transition p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {gruposVisiveis.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.12em] px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const ativo = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarAberta(false)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                        ativo
                          ? 'bg-gradient-to-r from-brand-500/90 to-brand-600/80 text-white shadow-lg shadow-brand-900/30'
                          : 'text-white/55 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {ativo && (
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-brand-300" />
                      )}
                      <Icon size={17} className={`flex-shrink-0 transition-transform ${ativo ? '' : 'group-hover:scale-110'}`} />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 mx-2 mb-2 rounded-2xl bg-white/[0.04] border border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none shadow-md">
              {iniciais}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/90 truncate">{usuario?.nome ?? '—'}</p>
              <p className="text-[11px] text-brand-300/70 truncate">{usuario ? roleLabels[usuario.role] ?? usuario.role : ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-[68px] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 bg-[var(--canvas)]/80 backdrop-blur-xl border-b border-[var(--hairline)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarAberta(true)}
              className="lg:hidden text-ink-soft hover:text-ink transition"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-display font-bold text-ink text-lg truncate">{tituloPagina}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Alternar tema"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-soft hover:text-red-500 hover:bg-red-500/10 transition"
              title="Sair"
            >
              <LogOut size={17} />
            </button>
            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-bold select-none ml-1.5 shadow-sm">
              {iniciais}
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
