'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart, Calendar, ClipboardList, Package, AlertTriangle,
  ChevronRight, Clock, DollarSign, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import api from '../../../lib/api';

interface Resumo {
  totalPacientes: number;
  agendamentosHoje: number;
  totalPrescricoes: number;
  itensEstoque: number;
  estoqueAbaixoMinimo: number;
  receitaHoje: number;
  receitaMes: number;
  totalPendente: number;
  qtdPendente: number;
  ultimosAtendimentos: {
    id: string;
    createdAt: string;
    diagnostico?: string;
    paciente: { nome: string; especie: string; tutor: { nome: string } };
  }[];
  proximosAgendamentos: {
    id: string;
    data: string;
    tipo?: string;
    paciente: { nome: string; tutor: { nome: string } };
    usuario: { nome: string };
  }[];
}

const especieEmoji: Record<string, string> = {
  Cão: '🐶', Gato: '🐱', Ave: '🐦', Coelho: '🐰', Hamster: '🐹', Réptil: '🦎', Outro: '🐾',
};

type Tone = 'brand' | 'accent' | 'amber' | 'sky' | 'rose';
const toneMap: Record<Tone, { bg: string; icon: string; ring: string }> = {
  brand: { bg: 'bg-brand-50 dark:bg-brand-950/60', icon: 'text-brand-600 dark:text-brand-400', ring: 'group-hover:ring-brand-300' },
  accent: { bg: 'bg-accent-50 dark:bg-accent-950/60', icon: 'text-accent-600 dark:text-accent-400', ring: 'group-hover:ring-accent-300' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/60', icon: 'text-amber-600 dark:text-amber-400', ring: 'group-hover:ring-amber-300' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950/60', icon: 'text-sky-600 dark:text-sky-400', ring: 'group-hover:ring-sky-300' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/60', icon: 'text-rose-600 dark:text-rose-400', ring: 'group-hover:ring-rose-300' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('usuario');
      if (raw) setNome((JSON.parse(raw).nome as string)?.split(' ')[0] ?? '');
    } catch { /* ignore */ }
    api.get('/dashboard/resumo')
      .then((r) => setResumo(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const cards: { icon: React.ElementType; label: string; valor?: number; tone: Tone; href: string; alerta?: boolean }[] = [
    { icon: Heart, label: 'Pacientes', valor: resumo?.totalPacientes, tone: 'brand', href: '/pacientes' },
    { icon: Calendar, label: 'Agendamentos hoje', valor: resumo?.agendamentosHoje, tone: 'sky', href: '/agenda' },
    { icon: ClipboardList, label: 'Atendimentos', valor: resumo?.totalPrescricoes, tone: 'accent', href: '/atendimentos' },
    { icon: Package, label: 'Itens em estoque', valor: resumo?.itensEstoque, tone: 'amber', href: '/estoque' },
    { icon: AlertTriangle, label: 'Estoque crítico', valor: resumo?.estoqueAbaixoMinimo, tone: 'rose', href: '/estoque', alerta: (resumo?.estoqueAbaixoMinimo ?? 0) > 0 },
  ];

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b201d] via-[#0a1a18] to-[#06100e] p-7 sm:p-8 text-white">
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-brand-300/80 text-sm font-medium capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-1">
            {saudacao}{nome ? `, ${nome}` : ''}! 🐾
          </h1>
          <p className="text-white/55 text-sm mt-1.5 max-w-md">
            Aqui está o resumo da sua clínica hoje.
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          const t = toneMap[card.tone];
          return (
            <button
              key={card.label}
              onClick={() => router.push(card.href)}
              className={`group surface rounded-2xl p-5 text-left ring-1 ring-transparent hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all duration-200 ${t.ring}`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${t.bg} mb-4`}>
                <Icon size={19} className={t.icon} />
              </div>
              <p className="text-[26px] leading-none font-display font-extrabold text-ink tabular-nums">
                {loading ? <span className="inline-block w-9 h-7 bg-black/5 dark:bg-white/5 rounded animate-pulse" /> : (card.valor ?? 0)}
              </p>
              <p className={`text-xs font-medium mt-2 ${card.alerta ? 'text-rose-500' : 'text-ink-soft'}`}>
                {card.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Cards financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          { icon: DollarSign, label: 'Receita hoje', valor: resumo ? formatBRL(resumo.receitaHoje) : '...', tone: 'brand' as Tone },
          { icon: TrendingUp, label: 'Receita do mês', valor: resumo ? formatBRL(resumo.receitaMes) : '...', tone: 'sky' as Tone },
          { icon: Clock, label: 'A receber', valor: resumo ? formatBRL(resumo.totalPendente) : '...', tone: 'amber' as Tone,
            sub: resumo && resumo.qtdPendente > 0 ? `${resumo.qtdPendente} em aberto` : undefined, alerta: (resumo?.qtdPendente ?? 0) > 0 },
        ].map((card) => {
          const Icon = card.icon;
          const t = toneMap[card.tone];
          return (
            <button
              key={card.label}
              onClick={() => router.push('/financeiro')}
              className="group surface rounded-2xl p-5 text-left hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${t.bg}`}>
                  <Icon size={17} className={t.icon} />
                </div>
                <ArrowUpRight size={16} className="text-ink-soft opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className="text-xl font-display font-extrabold text-ink tabular-nums">
                {loading ? <span className="inline-block w-24 h-6 bg-black/5 dark:bg-white/5 rounded animate-pulse" /> : card.valor}
              </p>
              <p className={`text-xs font-medium mt-1.5 ${card.alerta ? 'text-amber-600 dark:text-amber-400' : 'text-ink-soft'}`}>
                {card.sub ?? card.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Alerta estoque crítico */}
      {(resumo?.estoqueAbaixoMinimo ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={17} className="text-rose-500" />
          </div>
          <p className="text-sm text-rose-700 dark:text-rose-300 flex-1">
            <strong>{resumo!.estoqueAbaixoMinimo}</strong> {resumo!.estoqueAbaixoMinimo === 1 ? 'item está' : 'itens estão'} abaixo do estoque mínimo.
          </p>
          <button onClick={() => router.push('/estoque')} className="text-sm font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
            Ver estoque <ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimos atendimentos */}
        <div className="surface rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hairline)]">
            <h2 className="text-sm font-bold text-ink">Últimos atendimentos</h2>
            <button onClick={() => router.push('/atendimentos')} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium">
              Ver todos <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-[var(--hairline)]">
            {loading ? (
              <div className="px-5 py-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-2/3" />
                      <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : resumo?.ultimosAtendimentos?.length ? (
              resumo.ultimosAtendimentos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/50 dark:hover:bg-white/[0.02] transition">
                  <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-base flex-shrink-0">
                    {especieEmoji[a.paciente.especie] || '🐾'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{a.paciente.nome}</p>
                    <p className="text-xs text-ink-soft truncate">{a.diagnostico || 'Sem diagnóstico'} · {a.paciente.tutor.nome}</p>
                  </div>
                  <span className="text-xs text-ink-soft flex-shrink-0">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-ink-soft text-center">Nenhum atendimento registrado</p>
            )}
          </div>
        </div>

        {/* Próximos agendamentos */}
        <div className="surface rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hairline)]">
            <h2 className="text-sm font-bold text-ink">Próximos agendamentos</h2>
            <button onClick={() => router.push('/agenda')} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium">
              Ver agenda <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-[var(--hairline)]">
            {loading ? (
              <div className="px-5 py-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-2/3" />
                      <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : resumo?.proximosAgendamentos?.length ? (
              resumo.proximosAgendamentos.map((a) => {
                const d = new Date(a.data);
                const isHoje = d.toDateString() === new Date().toDateString();
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/50 dark:hover:bg-white/[0.02] transition">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isHoje ? 'bg-brand-100 dark:bg-brand-950/60' : 'bg-black/5 dark:bg-white/5'}`}>
                      <Clock size={15} className={isHoje ? 'text-brand-600 dark:text-brand-400' : 'text-ink-soft'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{a.paciente.nome}</p>
                      <p className="text-xs text-ink-soft truncate">{a.tipo || 'Consulta'} · {a.usuario.nome}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-bold ${isHoje ? 'text-brand-600 dark:text-brand-400' : 'text-ink'}`}>
                        {isHoje ? 'Hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </p>
                      <p className="text-xs text-ink-soft">{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-5 py-8 text-sm text-ink-soft text-center">Nenhum agendamento próximo</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
