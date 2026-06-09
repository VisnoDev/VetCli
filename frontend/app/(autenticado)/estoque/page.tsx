'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import { can, getStoredRole } from '../../../lib/permissions';

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
  const podeEditar = can(getStoredRole(), 'estoque:write');

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📦 Estoque</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input type="search" placeholder="Filtrar lista..." value={searchLista} onChange={(e) => setSearchLista(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-40 sm:w-52" />
          <button type="button" onClick={() => void carregar()} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">Buscar</button>
          {podeEditar && <button type="button" onClick={() => { setMedSel(null); setSearchMed(''); setSugestoes([]); setModalNovo(true); }} className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700">+ Incluir medicamento</button>}
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Por clínica. Entrada/saída rápida por delta; linhas abaixo do mínimo aparecem em destaque.</p>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : linhas.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">Nenhum item no estoque. Inclua medicamentos do catálogo.</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Medicamento', 'Qtd', 'Mínimo', ...(podeEditar ? ['Ajuste (+/−)', 'Ações'] : [])].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {linhas.map((L) => {
                const baixo = L.quantidade < L.minimo;
                return (
                  <tr key={L.id} className={baixo ? 'bg-amber-50 dark:bg-amber-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{L.medicamento.nome}</p>
                      {L.medicamento.principioAtivo && <p className="text-xs text-gray-500">{L.medicamento.principioAtivo}</p>}
                      {baixo && <span className="inline-block mt-1 text-xs text-amber-800 dark:text-amber-200 font-medium">Abaixo do mínimo</span>}
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} disabled={!podeEditar} className="w-20 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-70 disabled:cursor-default" defaultValue={L.quantidade} key={`q-${L.id}-${L.quantidade}`} onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== L.quantidade) void definirQuantidade(L.id, v); }} />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} disabled={!podeEditar} className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-70 disabled:cursor-default" defaultValue={L.minimo} key={`m-${L.id}-${L.minimo}`} onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== L.minimo) void salvarMinimo(L.id, v); }} />
                    </td>
                    {podeEditar && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input type="number" placeholder="±" className="w-20 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={deltaById[L.id] ?? ''} onChange={(e) => setDeltaById((d) => ({ ...d, [L.id]: e.target.value }))} />
                          <button type="button" onClick={() => void aplicarDelta(L.id)} className="text-xs px-2 py-1 rounded bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200">Aplicar</button>
                        </div>
                      </td>
                    )}
                    {podeEditar && (
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => void remover(L.id)} className="text-xs text-red-600 hover:underline">Remover</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Incluir no estoque</h2>
              <button type="button" onClick={fecharModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchMed}
                onChange={(e) => onBuscaMedicamentoChange(e.target.value)}
                onFocus={() => { if (searchMed.trim() === '' && sugestoes.length === 0) void carregarSugestoesIniciais(); }}
                placeholder="Ex: amoxi, tramadol..."
                autoComplete="off"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              {buscandoSugestoes && <p className="text-xs text-gray-500 mt-1">Buscando...</p>}
              {!buscandoSugestoes && sugestoes.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">
                  {sugestoes.map((m) => (
                    <button key={m.id} type="button" onClick={() => { setMedSel(m); setSugestoes([]); setSearchMed(m.nome); }} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-950 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                      <span className="font-medium">{m.nome}</span>
                      {m.principioAtivo && <span className="text-gray-500 text-xs ml-2">{m.principioAtivo}</span>}
                    </button>
                  ))}
                </div>
              )}
              {!buscandoSugestoes && searchMed.trim().length > 0 && sugestoes.length === 0 && !medSel && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Nenhum medicamento encontrado.</p>
              )}
            </div>

            {medSel && (
              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">Selecionado: <strong>{medSel.nome}</strong></p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantidade inicial</label>
                  <input type="number" min={0} value={qInicial} onChange={(e) => setQInicial(Number(e.target.value))} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alerta mínimo</label>
                  <input type="number" min={0} value={minInicial} onChange={(e) => setMinInicial(Number(e.target.value))} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={fecharModal} className="flex-1 border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
              <button type="button" onClick={() => void incluirMedicamento()} disabled={salvando || !medSel} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">{salvando ? 'Salvando...' : 'Incluir'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}