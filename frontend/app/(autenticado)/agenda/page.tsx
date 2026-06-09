'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import BuscaSelect from '../../../components/BuscaSelect';

type StatusAgenda = 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO';
interface Agendamento { id: string; data: string; tipo: string | null; status: string; observacoes: string | null; paciente: { id: string; nome: string; especie: string; tutor: { nome: string } }; usuario: { id: string; nome: string; role: string }; }
interface PacienteOpt { id: string; nome: string; especie: string; tutor: { nome: string }; }
interface UsuarioOpt { id: string; nome: string; role: string; }

const STATUS_OPTS: { value: StatusAgenda; label: string }[] = [
  { value: 'AGENDADO', label: 'Agendado' }, { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_ATENDIMENTO', label: 'Em atendimento' }, { value: 'CONCLUIDO', label: 'Concluído' }, { value: 'CANCELADO', label: 'Cancelado' },
];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function formatDateInputLocal(d: Date) { const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toDatetimeLocalValue(iso: string) { const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function AgendaPage() {
  const [items, setItems] = useState<Agendamento[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteOpt | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaRef, setDiaRef] = useState(() => startOfDay(new Date()));
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ pacienteId: '', usuarioId: '', data: '', tipo: 'Consulta', observacoes: '' });

  const fromIso = startOfDay(diaRef).toISOString();
  const toIso = endOfDay(addDays(diaRef, 6)).toISOString();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [agRes, usrRes] = await Promise.all([api.get<Agendamento[]>('/agendamentos', { params: { from: fromIso, to: toIso } }), api.get<UsuarioOpt[]>('/usuarios')]);
      setItems(agRes.data); setUsuarios(usrRes.data);
    } finally { setLoading(false); }
  }, [fromIso, toIso]);

  useEffect(() => { void carregar(); }, [carregar]);

  const porDia = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    for (const a of items) {
      const key = new Date(a.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [items]);

  function abrirNovo() {
    const base = new Date();
    base.setMinutes(base.getMinutes() - (base.getMinutes() % 30) + 30);
    setSelectedPaciente(null);
    setForm({ pacienteId: '', usuarioId: usuarios[0]?.id ?? '', data: toDatetimeLocalValue(base.toISOString()), tipo: 'Consulta', observacoes: '' });
    setModalNovo(true);
  }

  async function buscarPacientes(query: string): Promise<PacienteOpt[]> {
    const res = await api.get('/pacientes', { params: { search: query, limit: 10 } });
    return res.data.data;
  }

  async function criar() {
    if (!selectedPaciente || !form.data) return;
    setSalvando(true);
    try {
      await api.post('/agendamentos', { pacienteId: selectedPaciente.id, usuarioId: form.usuarioId || undefined, data: new Date(form.data).toISOString(), tipo: form.tipo || undefined, observacoes: form.observacoes || undefined });
      toast('Agendamento criado com sucesso.', 'success');
      setModalNovo(false); await carregar();
    } finally { setSalvando(false); }
  }

  async function atualizarStatus(id: string, status: string) { await api.patch(`/agendamentos/${id}`, { status }); await carregar(); }
  async function excluir(id: string) { if (!confirm('Excluir este agendamento?')) return; await api.delete(`/agendamentos/${id}`); toast('Agendamento excluído.', 'success'); await carregar(); }

  const statusBadge: Record<string, string> = {
    AGENDADO: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    CONFIRMADO: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200',
    EM_ATENDIMENTO: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200',
    CONCLUIDO: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
    CANCELADO: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📅 Agenda</h1>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          Semana a partir de
          <input type="date" value={formatDateInputLocal(diaRef)} onChange={(e) => { const v = e.target.value; if (!v) return; const [y, m, day] = v.split('-').map(Number); setDiaRef(startOfDay(new Date(y, m - 1, day))); }} className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </label>
        <button type="button" onClick={() => void carregar()} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">Atualizar</button>
        <button type="button" onClick={() => abrirNovo()} className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700">+ Novo agendamento</button>
      </div>
    </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Próximos 7 dias a partir da data selecionada. Horários na hora local.</p>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">Nenhum agendamento neste período.</div>
      ) : (
        <div className="space-y-8">
          {[...porDia.entries()].map(([diaLabel, lista]) => (
            <section key={diaLabel}>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 capitalize mb-3">{diaLabel}</h2>
              <ul className="space-y-3">
                {lista.slice().sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map((a) => (
                  <li key={a.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(a.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {a.paciente.nome} <span className="text-gray-500 font-normal">({a.paciente.especie}, tutor: {a.paciente.tutor.nome})</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.tipo || 'Sem tipo'} · Prof.: {a.usuario.nome} ({a.usuario.role})</p>
                      {a.observacoes && <p className="text-xs text-gray-500 mt-1">{a.observacoes}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[a.status] ?? 'bg-gray-100'}`}>{a.status.replace(/_/g, ' ')}</span>
                      <select value={a.status} onChange={(e) => void atualizarStatus(a.id, e.target.value)} className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button type="button" onClick={() => void excluir(a.id)} className="text-xs text-red-600 hover:underline">Excluir</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Novo agendamento</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente *</label>
                <BuscaSelect
                  placeholder="Digite o nome do paciente..."
                  value={selectedPaciente}
                  onChange={(p) => setSelectedPaciente(p)}
                  buscar={buscarPacientes}
                  renderLabel={(p) => p.nome}
                  renderSublabel={(p) => `${p.especie} · Tutor: ${p.tutor.nome}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profissional</label>
                <select value={form.usuarioId} onChange={(e) => setForm({ ...form, usuarioId: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data e hora *</label>
                <input type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <input type="text" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Consulta, retorno, vacina..." className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setModalNovo(false)} className="flex-1 border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
              <button type="button" onClick={() => void criar()} disabled={salvando || !selectedPaciente || !form.data} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">{salvando ? 'Salvando...' : 'Agendar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}