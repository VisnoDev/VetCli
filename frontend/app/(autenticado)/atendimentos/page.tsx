'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import Paginacao from '../../../components/Paginacao';
import BuscaSelect from '../../../components/BuscaSelect';
import { can, getStoredRole } from '../../../lib/permissions';

interface Tutor {
  id: string;
  nome: string;
}

interface Paciente {
  id: string;
  nome: string;
  especie: string;
  tutor: Tutor;
}

interface Usuario {
  id: string;
  nome: string;
  role: string;
}

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
  const podeEscrever = can(getStoredRole(), 'atendimentos:write');

  useEffect(() => { carregarDados(search, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarDados(s = search, p = page) {
    setLoading(true);
    try {
      const atRes = await api.get('/atendimentos', { params: { search: s || undefined, page: p, limit } });
      setAtendimentos(atRes.data.data);
      setTotal(atRes.data.total);
      setTotalPages(atRes.data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  async function buscar(s: string) {
    setSearch(s);
    setPage(1);
    carregarDados(s, 1);
  }

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
    setForm({
      pacienteId: a.paciente.id,
      queixa: a.queixa || '',
      diagnostico: a.diagnostico || '',
      observacoes: a.observacoes || '',
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.pacienteId && !atendimentoEditando) return;
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
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm('Deseja excluir este atendimento? Prescrições e exames vinculados também serão removidos.')) return;
    await api.delete(`/atendimentos/${id}`);
    toast('Atendimento excluído.', 'success');
    carregarDados();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🩺 Atendimentos</h1>
        {podeEscrever && (
          <button
            onClick={abrirModalNovo}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Novo Atendimento
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por paciente, queixa ou diagnóstico..."
          value={search}
          onChange={(e) => buscar(e.target.value)}
          className="w-full md:w-96 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : atendimentos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum atendimento registrado</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Paciente', 'Tutor', 'Veterinário', 'Data', 'Diagnóstico', 'Vínculos', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {atendimentos.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {especieEmoji[a.paciente.especie] || '🐾'} {a.paciente.nome}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {a.paciente.tutor.nome}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {a.usuario.nome}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {a.diagnostico || <span className="italic text-gray-300 dark:text-gray-600">Sem diagnóstico</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      {a._count.prescricoes > 0 && (
                        <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                          💊 {a._count.prescricoes}
                        </span>
                      )}
                      {a._count.solicitacoesExame > 0 && (
                        <span className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                          🔬 {a._count.solicitacoesExame}
                        </span>
                      )}
                      {a._count.prescricoes === 0 && a._count.solicitacoesExame === 0 && (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button
                      onClick={() => router.push(`/atendimentos/${a.id}`)}
                      className="text-brand-600 hover:text-brand-800 font-medium"
                    >
                      Ver
                    </button>
                    {podeEscrever && (
                      <button
                        onClick={() => abrirModalEditar(a)}
                        className="text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Editar
                      </button>
                    )}
                    {podeEscrever && (
                      <button
                        onClick={() => excluir(a.id)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao page={page} totalPages={totalPages} total={total} limit={limit} onChange={(p) => setPage(p)} />
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              {atendimentoEditando ? 'Editar Atendimento' : 'Novo Atendimento'}
            </h2>

            <div className="space-y-3">
              {!atendimentoEditando && (
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
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Queixa principal</label>
                <textarea
                  value={form.queixa}
                  onChange={(e) => setForm({ ...form, queixa: e.target.value })}
                  placeholder="Descreva a queixa do tutor..."
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnóstico</label>
                <textarea
                  value={form.diagnostico}
                  onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
                  placeholder="Diagnóstico clínico..."
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || (!atendimentoEditando && !selectedPaciente)}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
