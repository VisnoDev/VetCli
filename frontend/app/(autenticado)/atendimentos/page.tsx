'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Search, Eye, Pencil, Trash2, Pill, TestTube } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import Paginacao from '../../../components/Paginacao';
import BuscaSelect from '../../../components/BuscaSelect';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { can, useRole } from '../../../lib/permissions';

interface Tutor { id: string; nome: string; }
interface Paciente { id: string; nome: string; especie: string; tutor: Tutor; }
interface Usuario { id: string; nome: string; role: string; }
interface Atendimento {
  id: string;
  createdAt: string;
  queixa?: string;
  diagnostico?: string;
  observacoes?: string;
  paciente: Paciente;
  usuario: Usuario;
  _count: { prescricoes: number; solicitacoesExame: number };
}

const especieEmoji: Record<string, string> = {
  Cão: '🐶', Gato: '🐱', Ave: '🐦', Coelho: '🐰', Hamster: '🐹', Réptil: '🦎', Outro: '🐾',
};

const formVazio = { pacienteId: '', queixa: '', diagnostico: '', observacoes: '' };

export default function AtendimentosPage() {
  const router = useRouter();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [atendimentoEditando, setAtendimentoEditando] = useState<Atendimento | null>(null);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const podeEscrever = can(useRole(), 'atendimentos:write');

  useEffect(() => { carregarDados(search, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarDados(s = search, p = page) {
    setLoading(true);
    try {
      const atRes = await api.get('/atendimentos', { params: { search: s || undefined, page: p, limit } });
      setAtendimentos(atRes.data.data);
      setTotal(atRes.data.total);
      setTotalPages(atRes.data.totalPages);
    } finally { setLoading(false); }
  }

  function buscar(s: string) { setSearch(s); setPage(1); carregarDados(s, 1); }

  async function buscarPacientes(query: string): Promise<Paciente[]> {
    const res = await api.get('/pacientes', { params: { search: query, limit: 10 } });
    return res.data.data;
  }

  function abrirModalNovo() {
    setAtendimentoEditando(null);
    setSelectedPaciente(null);
    setForm(formVazio);
    setModalAberto(true);
  }

  function abrirModalEditar(a: Atendimento) {
    setAtendimentoEditando(a);
    setForm({ pacienteId: a.paciente.id, queixa: a.queixa || '', diagnostico: a.diagnostico || '', observacoes: a.observacoes || '' });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.pacienteId && !atendimentoEditando && !selectedPaciente) return;
    setSalvando(true);
    try {
      if (atendimentoEditando) {
        await api.patch(`/atendimentos/${atendimentoEditando.id}`, {
          queixa: form.queixa || undefined,
          diagnostico: form.diagnostico || undefined,
          observacoes: form.observacoes || undefined,
        });
        toast('Atendimento atualizado.', 'success');
      } else {
        await api.post('/atendimentos', {
          pacienteId: selectedPaciente?.id,
          queixa: form.queixa || undefined,
          diagnostico: form.diagnostico || undefined,
          observacoes: form.observacoes || undefined,
        });
        toast('Atendimento registrado com sucesso.', 'success');
      }
      setModalAberto(false);
      if (!atendimentoEditando) { setPage(1); carregarDados(search, 1); } else { carregarDados(); }
    } finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm('Deseja excluir este atendimento? Prescrições e exames vinculados também serão removidos.')) return;
    await api.delete(`/atendimentos/${id}`);
    toast('Atendimento excluído.', 'success');
    carregarDados();
  }

  return (
    <div>
      <PageHeader
        title="Atendimentos"
        subtitle="Consultas e registros clínicos"
        icon={<ClipboardList size={20} />}
        actions={podeEscrever && (
          <button onClick={abrirModalNovo} className="btn btn-primary"><Plus size={16} /> Novo atendimento</button>
        )}
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        <input type="text" placeholder="Buscar por paciente, queixa ou diagnóstico..." value={search} onChange={(e) => buscar(e.target.value)} className="input pl-10" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
        ) : atendimentos.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Nenhum atendimento registrado"
            description="Registre a primeira consulta para iniciar o histórico clínico."
            action={podeEscrever ? <button onClick={abrirModalNovo} className="btn btn-primary"><Plus size={16} /> Novo atendimento</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>{['Paciente', 'Tutor', 'Veterinário', 'Data', 'Diagnóstico', 'Vínculos', ''].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {atendimentos.map((a) => (
                  <tr key={a.id}>
                    <td className="cell-strong">
                      <span className="mr-1.5">{especieEmoji[a.paciente.especie] || '🐾'}</span>{a.paciente.nome}
                    </td>
                    <td>{a.paciente.tutor.nome}</td>
                    <td>{a.usuario.nome}</td>
                    <td className="whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="max-w-xs truncate">{a.diagnostico || <span className="text-ink-faint italic">Sem diagnóstico</span>}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {a._count.prescricoes > 0 && <span className="badge badge-sky"><Pill size={11} /> {a._count.prescricoes}</span>}
                        {a._count.solicitacoesExame > 0 && <span className="badge badge-brand"><TestTube size={11} /> {a._count.solicitacoesExame}</span>}
                        {a._count.prescricoes === 0 && a._count.solicitacoesExame === 0 && <span className="text-ink-faint text-xs">—</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => router.push(`/atendimentos/${a.id}`)} className="action-link inline-flex items-center gap-1"><Eye size={13} /> Ver</button>
                        {podeEscrever && <button onClick={() => abrirModalEditar(a)} className="action-link inline-flex items-center gap-1"><Pencil size={13} /> Editar</button>}
                        {podeEscrever && <button onClick={() => excluir(a.id)} className="action-link-danger inline-flex items-center gap-1"><Trash2 size={13} /> Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao page={page} totalPages={totalPages} total={total} limit={limit} onChange={(p) => setPage(p)} />
      </div>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={atendimentoEditando ? 'Editar atendimento' : 'Novo atendimento'}
        footer={
          <>
            <button onClick={() => setModalAberto(false)} className="btn btn-ghost flex-1">Cancelar</button>
            <button onClick={salvar} disabled={salvando || (!atendimentoEditando && !selectedPaciente)} className="btn btn-primary flex-1">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {!atendimentoEditando && (
            <div>
              <label className="label">Paciente *</label>
              <BuscaSelect
                placeholder="Digite o nome do paciente..."
                value={selectedPaciente}
                onChange={(p) => setSelectedPaciente(p)}
                buscar={buscarPacientes}
                renderLabel={(p) => p.nome}
                renderSublabel={(p) => `${p.especie} · Tutor: ${p.tutor.nome}`}
              />
            </div>
          )}
          <div>
            <label className="label">Queixa principal</label>
            <textarea value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} placeholder="Descreva a queixa do tutor..." rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="label">Diagnóstico</label>
            <textarea value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} placeholder="Diagnóstico clínico..." rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações adicionais..." rows={2} className="input resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
