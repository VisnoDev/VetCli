'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, Plus, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import Paginacao from '../../../components/Paginacao';

interface Cobranca {
  id: string;
  descricao: string;
  valor: number;
  formaPagamento: string;
  status: string;
  dataPagamento?: string;
  observacoes?: string;
  createdAt: string;
  atendimento?: { id: string; paciente: { nome: string } };
}

interface Resumo {
  receitaHoje: number;
  receitaMes: number;
  totalPendente: number;
  qtdPendente: number;
}

const FORMAS = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CONVENIO'];
const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito', CONVENIO: 'Convênio',
};

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const formVazio = {
  descricao: '', valor: '', formaPagamento: 'DINHEIRO',
  status: 'PENDENTE', atendimentoId: '', dataPagamento: '', observacoes: '',
};

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinanceiroPage() {
  const [cobranças, setCobranças] = useState<Cobranca[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cobranca | null>(null);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregar(statusFiltro, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregar(status = statusFiltro, p = page) {
    setLoading(true);
    try {
      const [cobRes, resRes] = await Promise.all([
        api.get('/cobrancas', { params: { status: status || undefined, page: p, limit } }),
        api.get('/cobrancas/resumo'),
      ]);
      setCobranças(cobRes.data.data);
      setTotal(cobRes.data.total);
      setTotalPages(cobRes.data.totalPages);
      setResumo(resRes.data);
    } finally { setLoading(false); }
  }

  function filtrar(status: string) {
    setStatusFiltro(status);
    setPage(1);
    carregar(status, 1);
  }

  function abrirModal(c?: Cobranca) {
    if (c) {
      setEditando(c);
      setForm({
        descricao: c.descricao,
        valor: c.valor.toString(),
        formaPagamento: c.formaPagamento,
        status: c.status,
        atendimentoId: c.atendimento?.id || '',
        dataPagamento: c.dataPagamento ? c.dataPagamento.split('T')[0] : '',
        observacoes: c.observacoes || '',
      });
    } else {
      setEditando(null);
      setForm(formVazio);
    }
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.descricao || !form.valor) return;
    setSalvando(true);
    try {
      const payload = {
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        formaPagamento: form.formaPagamento,
        status: form.status,
        atendimentoId: form.atendimentoId || undefined,
        dataPagamento: form.dataPagamento || undefined,
        observacoes: form.observacoes || undefined,
      };
      if (editando) {
        await api.patch(`/cobrancas/${editando.id}`, payload);
        toast('Cobrança atualizada.', 'success');
      } else {
        await api.post('/cobrancas', payload);
        toast('Cobrança registrada.', 'success');
      }
      setModalAberto(false);
      carregar(statusFiltro, editando ? page : 1);
      if (!editando) setPage(1);
    } finally { setSalvando(false); }
  }

  async function marcarPago(c: Cobranca) {
    await api.patch(`/cobrancas/${c.id}`, {
      status: 'PAGO',
      dataPagamento: new Date().toISOString().split('T')[0],
    });
    toast('Marcado como pago.', 'success');
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm('Deseja excluir esta cobrança?')) return;
    await api.delete(`/cobrancas/${id}`);
    toast('Cobrança excluída.', 'success');
    carregar();
  }

  const statusBadge: Record<string, string> = {
    PENDENTE: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    PAGO: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    CANCELADO: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300',
  };
  const statusLabel: Record<string, string> = { PENDENTE: 'Pendente', PAGO: 'Pago', CANCELADO: 'Cancelado' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financeiro</h1>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={15} />
          Nova Cobrança
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <DollarSign size={17} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Receita hoje</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {resumo ? formatBRL(resumo.receitaHoje) : '...'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
              <TrendingUp size={17} className="text-brand-600 dark:text-brand-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Receita do mês</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {resumo ? formatBRL(resumo.receitaMes) : '...'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <Clock size={17} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">A receber</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {resumo ? formatBRL(resumo.totalPendente) : '...'}
          </p>
          {(resumo?.qtdPendente ?? 0) > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {resumo!.qtdPendente} cobrança{resumo!.qtdPendente > 1 ? 's' : ''} em aberto
            </p>
          )}
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => filtrar(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              statusFiltro === tab.value
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : cobranças.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma cobrança registrada</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Descrição', 'Paciente', 'Valor', 'Forma', 'Status', 'Data', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cobranças.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                    {c.descricao}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {c.atendimento?.paciente.nome || <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatBRL(c.valor)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {FORMA_LABEL[c.formaPagamento] || c.formaPagamento}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[c.status] || ''}`}>
                      {statusLabel[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {c.dataPagamento
                      ? new Date(c.dataPagamento).toLocaleDateString('pt-BR')
                      : new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.status === 'PENDENTE' && (
                        <button
                          onClick={() => marcarPago(c)}
                          className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 transition"
                          title="Marcar como pago"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => abrirModal(c)}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(c.id)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao page={page} totalPages={totalPages} total={total} limit={limit} onChange={(p) => setPage(p)} />
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editando ? 'Editar Cobrança' : 'Nova Cobrança'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Consulta clínica, Vacina antirrábica..."
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de pagamento</label>
                <select
                  value={form.formaPagamento}
                  onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {FORMAS.map((f) => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
              {form.status === 'PAGO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de pagamento</label>
                  <input
                    type="date"
                    value={form.dataPagamento}
                    onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                  placeholder="Observações opcionais..."
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
                disabled={salvando || !form.descricao || !form.valor}
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
