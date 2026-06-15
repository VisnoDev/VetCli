'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, RefreshCw, Trash2, Clock } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import BuscaSelect from '../../../components/BuscaSelect';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';

type StatusAgenda = 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO';
interface Agendamento { id: string; data: string; tipo: string | null; status: string; observacoes: string | null; paciente: { id: string; nome: string; especie: string; tutor: { nome: string } }; usuario: { id: string; nome: string; role: string }; }
interface PacienteOpt { id: string; nome: string; especie: string; tutor: { nome: string }; }
interface UsuarioOpt { id: string; nome: string; role: string; }

const STATUS_OPTS: { value: StatusAgenda; label: string }[] = [
  { value: 'AGENDADO', label: 'Agendado' }, { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_ATENDIMENTO', label: 'Em atendimento' }, { value: 'CONCLUIDO', label: 'Concluído' }, { value: 'CANCELADO', label: 'Cancelado' },
];

const statusBadge: Record<string, string> = {
  AGENDADO: 'badge-gray', CONFIRMADO: 'badge-sky', EM_ATENDIMENTO: 'badge-amber', CONCLUIDO: 'badge-green', CANCELADO: 'badge-red',
};

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

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Próximos 7 dias a partir da data selecionada"
        icon={<Calendar size={20} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={formatDateInputLocal(diaRef)} onChange={(e) => { const v = e.target.value; if (!v) return; const [y, m, day] = v.split('-').map(Number); setDiaRef(startOfDay(new Date(y, m - 1, day))); }} className="input w-auto py-2" />
            <button type="button" onClick={() => void carregar()} className="btn btn-ghost"><RefreshCw size={15} /></button>
            <button type="button" onClick={() => abrirNovo()} className="btn btn-primary"><Plus size={16} /> Novo</button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">Nenhum agendamento neste período.</div>
      ) : (
        <div className="space-y-7">
          {[...porDia.entries()].map(([diaLabel, lista]) => (
            <section key={diaLabel}>
              <h2 className="font-display text-base font-bold text-ink capitalize mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> {diaLabel}
              </h2>
              <ul className="space-y-2.5">
                {lista.slice().sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map((a) => (
                  <li key={a.id} className="card-interactive p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-brand-50 dark:bg-brand-950/60 flex-shrink-0">
                        <Clock size={14} className="text-brand-600 dark:text-brand-400" />
                        <span className="text-xs font-bold text-brand-700 dark:text-brand-300 mt-0.5">{new Date(a.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{a.paciente.nome} <span className="text-ink-faint font-normal text-sm">({a.paciente.especie})</span></p>
                        <p className="text-sm text-ink-soft mt-0.5 truncate">{a.tipo || 'Consulta'} · {a.usuario.nome} · Tutor: {a.paciente.tutor.nome}</p>
                        {a.observacoes && <p className="text-xs text-ink-faint mt-1 truncate">{a.observacoes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <span className={`badge ${statusBadge[a.status] ?? 'badge-gray'}`}>{a.status.replace(/_/g, ' ').toLowerCase()}</span>
                      <select value={a.status} onChange={(e) => void atualizarStatus(a.id, e.target.value)} className="text-xs rounded-lg px-2 py-1 surface border outline-none focus:border-brand-400">
                        {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button type="button" onClick={() => void excluir(a.id)} className="action-link-danger inline-flex items-center gap-1"><Trash2 size={13} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalNovo}
        onClose={() => setModalNovo(false)}
        title="Novo agendamento"
        footer={
          <>
            <button type="button" onClick={() => setModalNovo(false)} className="btn btn-ghost flex-1">Cancelar</button>
            <button type="button" onClick={() => void criar()} disabled={salvando || !selectedPaciente || !form.data} className="btn btn-primary flex-1">{salvando ? 'Salvando...' : 'Agendar'}</button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label">Paciente *</label>
            <BuscaSelect placeholder="Digite o nome do paciente..." value={selectedPaciente} onChange={(p) => setSelectedPaciente(p)} buscar={buscarPacientes} renderLabel={(p) => p.nome} renderSublabel={(p) => `${p.especie} · Tutor: ${p.tutor.nome}`} />
          </div>
          <div>
            <label className="label">Profissional</label>
            <select value={form.usuarioId} onChange={(e) => setForm({ ...form, usuarioId: e.target.value })} className="input">
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data e hora *</label>
              <input type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Tipo</label>
              <input type="text" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Consulta, retorno..." className="input" />
            </div>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className="input resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
