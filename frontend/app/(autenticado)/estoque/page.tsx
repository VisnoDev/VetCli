'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Package, Plus, Search, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { can, useRole } from '../../../lib/permissions';

interface Medicamento { id: string; nome: string; principioAtivo?: string; categoria?: string; }
interface LinhaEstoque { id: string; quantidade: number; minimo: number; updatedAt: string; medicamento: Medicamento; }

export default function EstoquePage() {
  const [linhas, setLinhas] = useState<LinhaEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLista, setSearchLista] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [searchMed, setSearchMed] = useState('');
  const [sugestoes, setSugestoes] = useState<Medicamento[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [medSel, setMedSel] = useState<Medicamento | null>(null);
  const [qInicial, setQInicial] = useState(0);
  const [minInicial, setMinInicial] = useState(5);
  const [salvando, setSalvando] = useState(false);
  const [deltaById, setDeltaById] = useState<Record<string, string>>({});
  const debounceBuscaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linhasRef = useRef(linhas);
  linhasRef.current = linhas;
  const podeEditar = can(useRole(), 'estoque:write');

  const filtrarJaNoEstoque = useCallback((lista: Medicamento[]) => {
    const ids = new Set(linhasRef.current.map((l) => l.medicamento.id));
    return lista.filter((m) => !ids.has(m.id));
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LinhaEstoque[]>('/estoque', { params: searchLista.trim() ? { search: searchLista.trim() } : {} });
      setLinhas(res.data);
    } finally { setLoading(false); }
  }, [searchLista]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { return () => { if (debounceBuscaRef.current) clearTimeout(debounceBuscaRef.current); }; }, []);

  const carregarSugestoesIniciais = useCallback(async () => {
    setBuscandoSugestoes(true);
    try {
      const res = await api.get<Medicamento[]>('/prescricoes/medicamentos');
      setSugestoes(filtrarJaNoEstoque(res.data).slice(0, 50));
    } finally { setBuscandoSugestoes(false); }
  }, [filtrarJaNoEstoque]);

  useEffect(() => {
    if (!modalNovo) return;
    if (searchMed.trim() === '') void carregarSugestoesIniciais();
  }, [modalNovo, linhas, carregarSugestoesIniciais, searchMed]);

  function onBuscaMedicamentoChange(raw: string) {
    setSearchMed(raw);
    if (debounceBuscaRef.current) clearTimeout(debounceBuscaRef.current);
    const q = raw.trim();
    if (q.length === 0) { void carregarSugestoesIniciais(); return; }
    setBuscandoSugestoes(true);
    debounceBuscaRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await api.get<Medicamento[]>('/prescricoes/medicamentos', { params: { search: q } });
          setSugestoes(filtrarJaNoEstoque(res.data));
        } finally { setBuscandoSugestoes(false); }
      })();
    }, 220);
  }

  function fecharModal() {
    if (debounceBuscaRef.current) clearTimeout(debounceBuscaRef.current);
    setModalNovo(false);
    setMedSel(null);
    setSearchMed('');
    setSugestoes([]);
    setQInicial(0);
    setMinInicial(5);
  }

  async function incluirMedicamento() {
    if (!medSel) return;
    setSalvando(true);
    try {
      await api.post('/estoque', { medicamentoId: medSel.id, quantidade: qInicial, minimo: minInicial });
      toast(`${medSel.nome} incluído no estoque.`, 'success');
      fecharModal();
      await carregar();
    } finally { setSalvando(false); }
  }

  async function aplicarDelta(id: string) {
    const raw = deltaById[id]?.trim();
    if (!raw) return;
    const n = Number(raw);
    if (Number.isNaN(n) || n === 0) return;
    await api.patch(`/estoque/${id}`, { delta: n });
    setDeltaById((d) => ({ ...d, [id]: '' }));
    await carregar();
  }

  async function salvarMinimo(id: string, minimo: number) { await api.patch(`/estoque/${id}`, { minimo }); await carregar(); }
  async function definirQuantidade(id: string, quantidade: number) { if (quantidade < 0) return; await api.patch(`/estoque/${id}`, { quantidade }); await carregar(); }
  async function remover(id: string) { if (!confirm('Remover este medicamento do estoque?')) return; await api.delete(`/estoque/${id}`); toast('Medicamento removido do estoque.', 'success'); await carregar(); }

  const inputMini = 'rounded-lg px-2 py-1 text-sm surface border focus:border-brand-400 outline-none disabled:opacity-70 disabled:cursor-default';

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Controle de medicamentos por clínica"
        icon={<Package size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              <input type="search" placeholder="Filtrar..." value={searchLista} onChange={(e) => setSearchLista(e.target.value)} className="input pl-9 w-44" />
            </div>
            {podeEditar && <button type="button" onClick={() => { setMedSel(null); setSearchMed(''); setSugestoes([]); setModalNovo(true); }} className="btn btn-primary"><Plus size={16} /> Incluir</button>}
          </div>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
        ) : linhas.length === 0 ? (
          <EmptyState icon={<Package size={24} />} title="Nenhum item no estoque" description="Inclua medicamentos do catálogo para controlar quantidades e alertas de mínimo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>{['Medicamento', 'Qtd', 'Mínimo', ...(podeEditar ? ['Ajuste (+/−)', ''] : [])].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {linhas.map((L) => {
                  const baixo = L.quantidade < L.minimo;
                  return (
                    <tr key={L.id} className={baixo ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}>
                      <td className="cell-strong">
                        <p>{L.medicamento.nome}</p>
                        {L.medicamento.principioAtivo && <p className="text-xs text-ink-faint font-normal">{L.medicamento.principioAtivo}</p>}
                        {baixo && <span className="badge badge-amber mt-1"><AlertTriangle size={11} /> Abaixo do mínimo</span>}
                      </td>
                      <td>
                        <input type="number" min={0} disabled={!podeEditar} className={`w-20 ${inputMini}`} defaultValue={L.quantidade} key={`q-${L.id}-${L.quantidade}`} onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== L.quantidade) void definirQuantidade(L.id, v); }} />
                      </td>
                      <td>
                        <input type="number" min={0} disabled={!podeEditar} className={`w-16 ${inputMini}`} defaultValue={L.minimo} key={`m-${L.id}-${L.minimo}`} onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== L.minimo) void salvarMinimo(L.id, v); }} />
                      </td>
                      {podeEditar && (
                        <td>
                          <div className="flex items-center gap-1.5">
                            <input type="number" placeholder="±" className={`w-20 ${inputMini}`} value={deltaById[L.id] ?? ''} onChange={(e) => setDeltaById((d) => ({ ...d, [L.id]: e.target.value }))} />
                            <button type="button" onClick={() => void aplicarDelta(L.id)} className="btn btn-sm bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-200">Aplicar</button>
                          </div>
                        </td>
                      )}
                      {podeEditar && (
                        <td>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => void remover(L.id)} className="action-link-danger inline-flex items-center gap-1"><Trash2 size={13} /> Remover</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalNovo}
        onClose={fecharModal}
        title="Incluir no estoque"
        footer={
          <>
            <button type="button" onClick={fecharModal} className="btn btn-ghost flex-1">Cancelar</button>
            <button type="button" onClick={() => void incluirMedicamento()} disabled={salvando || !medSel} className="btn btn-primary flex-1">{salvando ? 'Salvando...' : 'Incluir'}</button>
          </>
        }
      >
        <div>
          <input
            type="text"
            value={searchMed}
            onChange={(e) => onBuscaMedicamentoChange(e.target.value)}
            onFocus={() => { if (searchMed.trim() === '' && sugestoes.length === 0) void carregarSugestoesIniciais(); }}
            placeholder="Ex: amoxi, tramadol..."
            autoComplete="off"
            className="input"
          />
          {buscandoSugestoes && <p className="text-xs text-ink-faint mt-1.5">Buscando...</p>}
          {!buscandoSugestoes && sugestoes.length > 0 && (
            <div className="surface rounded-xl mt-1.5 max-h-48 overflow-y-auto p-1">
              {sugestoes.map((m) => (
                <button key={m.id} type="button" onClick={() => { setMedSel(m); setSugestoes([]); setSearchMed(m.nome); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-brand-50 dark:hover:bg-brand-950/50 transition text-ink">
                  <span className="font-medium">{m.nome}</span>
                  {m.principioAtivo && <span className="text-ink-faint text-xs ml-2">{m.principioAtivo}</span>}
                </button>
              ))}
            </div>
          )}
          {!buscandoSugestoes && searchMed.trim().length > 0 && sugestoes.length === 0 && !medSel && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5">Nenhum medicamento encontrado.</p>
          )}
        </div>

        {medSel && (
          <div className="space-y-3.5 mt-4">
            <p className="text-sm text-ink-soft">Selecionado: <strong className="text-ink">{medSel.nome}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantidade inicial</label>
                <input type="number" min={0} value={qInicial} onChange={(e) => setQInicial(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Alerta mínimo</label>
                <input type="number" min={0} value={minInicial} onChange={(e) => setMinInicial(Number(e.target.value))} className="input" />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
