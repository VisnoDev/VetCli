'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, Plus, CheckCircle, Banknote, Pencil, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import Paginacao from '../../../components/Paginacao';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';

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

interface Resumo { receitaHoje: number; receitaMes: number; totalPendente: number; qtdPendente: number; }

const FORMAS = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CONVENIO'];
const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO_CREDITO: 'Cartão Crédito', CARTAO_DEBITO: 'Cartão Débito', CONVENIO: 'Convênio',
};

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const formVazio = { descricao: '', valor: '', formaPagamento: 'DINHEIRO', status: 'PENDENTE', atendimentoId: '', dataPagamento: '', observacoes: '' };

function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

const statusBadge: Record<string, string> = { PENDENTE: 'badge-amber', PAGO: 'badge-green', CANCELADO: 'badge-red' };
const statusLabel: Record<string, string> = { PENDENTE: 'Pendente', PAGO: 'Pago', CANCELADO: 'Cancelado' };

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

  function filtrar(status: string) { setStatusFiltro(status); setPage(1); carregar(status, 1); }

  function abrirModal(c?: Cobranca) {
    if (c) {
      setEditando(c);
      setForm({
        descricao: c.descricao, valor: c.valor.toString(), formaPagamento: c.formaPagamento, status: c.status,
        atendimentoId: c.atendimento?.id || '', dataPagamento: c.dataPagamento ? c.dataPagamento.split('T')[0] : '', observacoes: c.observacoes || '',
      });
    } else { setEditando(null); setForm(formVazio); }
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.descricao || !form.valor) return;
    setSalvando(true);
    try {
      const payload = {
        descricao: form.descricao, valor: parseFloat(form.valor), formaPagamento: form.formaPagamento, status: form.status,
        atendimentoId: form.atendimentoId || undefined, dataPagamento: form.dataPagamento || undefined, observacoes: form.observacoes || undefined,
      };
      if (editando) { await api.patch(`/cobrancas/${editando.id}`, payload); toast('Cobrança atualizada.', 'success'); }
      else { await api.post('/cobrancas', payload); toast('Cobrança registrada.', 'success'); }
      setModalAberto(false);
      carregar(statusFiltro, editando ? page : 1);
      if (!editando) setPage(1);
    } finally { setSalvando(false); }
  }

  async function marcarPago(c: Cobranca) {
    await api.patch(`/cobrancas/${c.id}`, { status: 'PAGO', dataPagamento: new Date().toISOString().split('T')[0] });
    toast('Marcado como pago.', 'success');
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm('Deseja excluir esta cobrança?')) return;
    await api.delete(`/cobrancas/${id}`);
    toast('Cobrança excluída.', 'success');
    carregar();
  }

  const cards = [
    { icon: DollarSign, label: 'Receita hoje', valor: resumo ? formatBRL(resumo.receitaHoje) : '...', tone: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' },
    { icon: TrendingUp, label: 'Receita do mês', valor: resumo ? formatBRL(resumo.receitaMes) : '...', tone: 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400' },
    { icon: Clock, label: 'A receber', valor: resumo ? formatBRL(resumo.totalPendente) : '...', tone: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400', sub: (resumo?.qtdPendente ?? 0) > 0 ? `${resumo!.qtdPendente} em aberto` : undefined },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle="Cobranças e recebimentos da clínica"
        icon={<Banknote size={20} />}
        actions={<button onClick={() => abrirModal()} className="btn btn-primary"><Plus size={16} /> Nova cobrança</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.tone}`}><Icon size={17} /></div>
                <span className="text-sm text-ink-soft">{card.label}</span>
              </div>
              <p className="text-2xl font-display font-extrabold text-ink tabular-nums">{card.valor}</p>
              {card.sub && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{card.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => filtrar(tab.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              statusFiltro === tab.value ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'btn-ghost'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
        ) : cobranças.length === 0 ? (
          <EmptyState icon={<Banknote size={24} />} title="Nenhuma cobrança registrada" description="Registre a primeira cobrança para acompanhar o faturamento." action={<button onClick={() => abrirModal()} className="btn btn-primary"><Plus size={16} /> Nova cobrança</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>{['Descrição', 'Paciente', 'Valor', 'Forma', 'Status', 'Data', ''].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {cobranças.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-strong max-w-[200px] truncate">{c.descricao}</td>
                    <td>{c.atendimento?.paciente.nome || <span className="text-ink-faint">—</span>}</td>
                    <td className="cell-strong tabular-nums">{formatBRL(c.valor)}</td>
                    <td>{FORMA_LABEL[c.formaPagamento] || c.formaPagamento}</td>
                    <td><span className={`badge ${statusBadge[c.status] || 'badge-gray'}`}>{statusLabel[c.status] || c.status}</span></td>
                    <td className="whitespace-nowrap">{c.dataPagamento ? new Date(c.dataPagamento).toLocaleDateString('pt-BR') : new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        {c.status === 'PENDENTE' && (
                          <button onClick={() => marcarPago(c)} className="text-emerald-600 hover:text-emerald-700 transition" title="Marcar como pago"><CheckCircle size={16} /></button>
                        )}
                        <button onClick={() => abrirModal(c)} className="action-link inline-flex items-center gap-1"><Pencil size={13} /> Editar</button>
                        <button onClick={() => excluir(c.id)} className="action-link-danger inline-flex items-center gap-1"><Trash2 size={13} /> Excluir</button>
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
        title={editando ? 'Editar cobrança' : 'Nova cobrança'}
        footer={
          <>
            <button onClick={() => setModalAberto(false)} className="btn btn-ghost flex-1">Cancelar</button>
            <button onClick={salvar} disabled={salvando || !form.descricao || !form.valor} className="btn btn-primary flex-1">{salvando ? 'Salvando...' : 'Salvar'}</button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label">Descrição *</label>
            <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Consulta clínica, Vacina antirrábica..." className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" className="input" />
            </div>
            <div>
              <label className="label">Forma</label>
              <select value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })} className="input">
                {FORMAS.map((f) => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          {form.status === 'PAGO' && (
            <div>
              <label className="label">Data de pagamento</label>
              <input type="date" value={form.dataPagamento} onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })} className="input" />
            </div>
          )}
          <div>
            <label className="label">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} placeholder="Observações opcionais..." className="input resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
