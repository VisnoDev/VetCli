'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import { can, getStoredRole } from '../../../lib/permissions';

const CATEGORIAS_EXAMES: Record<string, string[]> = {
  'Hematologia': ['Hemograma completo', 'Contagem de plaquetas', 'Reticulócitos', 'Pesquisa de hemoparasitas'],
  'Bioquímica Sanguínea': ['ALT (TGP)', 'AST (TGO)', 'Fosfatase Alcalina', 'GGT', 'Ureia', 'Creatinina', 'Glicose', 'Colesterol', 'Triglicerídeos', 'Albumina', 'Proteínas totais', 'Bilirrubinas', 'Sódio', 'Potássio', 'Cálcio'],
  'Urinálise': ['Exame físico da urina', 'Exame químico', 'Sedimentoscopia', 'Relação proteína/creatinina urinária'],
  'Parasitologia': ['Exame de fezes', 'Pesquisa de parasitas', 'Flutuação fecal'],
  'Microbiologia': ['Cultura bacteriana', 'Antibiograma', 'Cultura fúngica'],
  'Citologia': ['Citologia de pele', 'Citologia auricular', 'Citologia de nódulos e massas', 'Citologia vaginal'],
  'Sorologia': ['FIV/FELV', 'Leishmaniose', 'Erliquiose', 'Cinomose', 'Parvovirose'],
  'Hormônios': ['T4 Total', 'T4 Livre', 'TSH', 'Cortisol', 'Insulina'],
  'Molecular': ['PCR para doenças infecciosas', 'Testes genéticos'],
};

const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  SOLICITADO: { label: 'Solicitado', cor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  AMOSTRA_COLETADA: { label: 'Amostra Coletada', cor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  EM_PROCESSAMENTO: { label: 'Em Processamento', cor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  AGUARDANDO_VALIDACAO: { label: 'Aguardando Validação', cor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  LIBERADO: { label: 'Liberado', cor: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' },
  ENTREGUE: { label: 'Entregue', cor: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
};

export default function LaboratorioPage() {
  const router = useRouter();
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ atendimentoId: '', observacoes: '' });
  const [itensSelecionados, setItensSelecionados] = useState<{ categoriaExame: string; nomeExame: string }[]>([]);
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>({});
  const [buscaAtendimento, setBuscaAtendimento] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  useEffect(() => { carregarDados(); }, [filtroStatus]);

  // Criar/gerenciar solicitações depende de poder escrever no laboratório (vet e bioquímico têm).
  const podeCriarSolicitacao = can(getStoredRole(), 'laboratorio:write');

  async function carregarDados() {
    setLoading(true);
    try {
      const solRes = await api.get('/laboratorio', { params: filtroStatus ? { status: filtroStatus } : {} });
      setSolicitacoes(solRes.data);
      // Lista de atendimentos só é necessária para abrir uma nova solicitação.
      if (podeCriarSolicitacao) {
        const atRes = await api.get('/atendimentos', { params: { limit: 1000 } });
        setAtendimentos(atRes.data.data);
      }
    } finally { setLoading(false); }
  }

  const atendimentoSelecionado = atendimentos.find((a: any) => a.id === form.atendimentoId);

  const atendimentosFiltrados = atendimentos.filter((a: any) => {
    if (!buscaAtendimento.trim()) return true;
    const termo = buscaAtendimento.toLowerCase();
    return (
      a.paciente.nome.toLowerCase().includes(termo) ||
      a.paciente.tutor.nome.toLowerCase().includes(termo) ||
      (a.diagnostico && a.diagnostico.toLowerCase().includes(termo))
    );
  });

  const solicitacoesFiltradas = solicitacoes.filter((s) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      s.numero.toLowerCase().includes(termo) ||
      s.atendimento.paciente.nome.toLowerCase().includes(termo) ||
      s.atendimento.paciente.tutor.nome.toLowerCase().includes(termo)
    );
  });

  function toggleExame(categoria: string, exame: string) {
    const existe = itensSelecionados.find(i => i.categoriaExame === categoria && i.nomeExame === exame);
    if (existe) {
      setItensSelecionados(itensSelecionados.filter(i => !(i.categoriaExame === categoria && i.nomeExame === exame)));
    } else {
      setItensSelecionados([...itensSelecionados, { categoriaExame: categoria, nomeExame: exame }]);
    }
  }

  function toggleCategoria(categoria: string) {
    setCategoriasAbertas(prev => ({ ...prev, [categoria]: !prev[categoria] }));
  }

  async function criarSolicitacao() {
    if (!form.atendimentoId || itensSelecionados.length === 0) return;
    setSalvando(true);
    try {
      await api.post('/laboratorio', { ...form, itens: itensSelecionados });
      toast('Solicitação de exame registrada.', 'success');
      setModalNovo(false);
      setForm({ atendimentoId: '', observacoes: '' });
      setItensSelecionados([]);
      carregarDados();
    } finally { setSalvando(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🔬 Laboratório</h1>
        {podeCriarSolicitacao && (
          <button onClick={() => setModalNovo(true)} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Nova Solicitação
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔍 Buscar por paciente, tutor ou nº da solicitação..."
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[{ value: '', label: 'Todos' }, ...Object.entries(STATUS_LABELS).map(([v, s]) => ({ value: v, label: s.label }))].map((f) => (
          <button key={f.value} onClick={() => setFiltroStatus(f.value)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${filtroStatus === f.value ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de solicitações */}
      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : solicitacoesFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">
          {busca ? `Nenhuma solicitação encontrada para "${busca}"` : 'Nenhuma solicitação encontrada'}
        </div>
      ) : (
        <div className="space-y-3">
          {solicitacoesFiltradas.map((s) => {
            const status = STATUS_LABELS[s.status] ?? STATUS_LABELS.SOLICITADO;
            return (
              <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{s.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cor}`}>{status.label}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      🐾 {s.atendimento.paciente.nome} <span className="text-gray-500 font-normal text-sm">({s.atendimento.paciente.especie})</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tutor: {s.atendimento.paciente.tutor.nome} • Vet: {s.atendimento.usuario.nome}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(s.createdAt).toLocaleDateString('pt-BR')} • {s.itens.length} exame(s)
                    </p>
                  </div>
                  <button onClick={() => router.push(`/laboratorio/${s.id}`)} className="text-sm text-brand-600 hover:text-brand-800 font-medium whitespace-nowrap">
                    Ver →
                  </button>
                </div>

                {/* Exames resumidos */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.itens.slice(0, 5).map((item: any) => (
                    <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full ${item.resultado ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      {item.nomeExame}
                    </span>
                  ))}
                  {s.itens.length > 5 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">+{s.itens.length - 5}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nova solicitação */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Nova Solicitação de Exames</h2>
              <button onClick={() => { setModalNovo(false); setBuscaAtendimento(''); setDropdownAberto(false); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atendimento *</label>

                {/* Campo de busca */}
                <input
                  type="text"
                  value={atendimentoSelecionado ? `${atendimentoSelecionado.paciente.nome} — ${new Date(atendimentoSelecionado.createdAt).toLocaleDateString('pt-BR')}${atendimentoSelecionado.diagnostico ? ` (${atendimentoSelecionado.diagnostico})` : ''}` : buscaAtendimento}
                  onChange={(e) => {
                    setBuscaAtendimento(e.target.value);
                    setForm({ ...form, atendimentoId: '' });
                    setDropdownAberto(true);
                  }}
                  onFocus={() => setDropdownAberto(true)}
                  placeholder="Buscar por paciente, tutor ou diagnóstico..."
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />

                {/* Dropdown de resultados */}
                {dropdownAberto && (
                  <>
                    {/* overlay para fechar ao clicar fora */}
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownAberto(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {atendimentosFiltrados.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">Nenhum atendimento encontrado</p>
                      ) : (
                        atendimentosFiltrados.map((a: any) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, atendimentoId: a.id });
                              setBuscaAtendimento('');
                              setDropdownAberto(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-950 transition ${form.atendimentoId === a.id ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            <span className="font-medium">{a.paciente.nome}</span>
                            <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">• {a.paciente.tutor.nome}</span>
                            <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">• {new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
                            {a.diagnostico && <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">({a.diagnostico})</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} placeholder="Informações relevantes para o laboratório..." className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            {/* Seleção de exames */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exames *</label>
                {itensSelecionados.length > 0 && (
                  <span className="text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                    {itensSelecionados.length} selecionado(s)
                  </span>
                )}
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                {Object.entries(CATEGORIAS_EXAMES).map(([categoria, exames]) => (
                  <div key={categoria} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <button type="button" onClick={() => toggleCategoria(categoria)} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span>{categoria}</span>
                      <span>{categoriasAbertas[categoria] ? '▲' : '▼'}</span>
                    </button>
                    {categoriasAbertas[categoria] && (
                      <div className="p-2 grid grid-cols-2 gap-1">
                        {exames.map((exame) => {
                          const selecionado = itensSelecionados.some(i => i.categoriaExame === categoria && i.nomeExame === exame);
                          return (
                            <button key={exame} type="button" onClick={() => toggleExame(categoria, exame)} className={`text-left text-xs px-2 py-1.5 rounded-lg transition ${selecionado ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-950 border border-gray-200 dark:border-gray-700'}`}>
                              {selecionado ? '✓ ' : ''}{exame}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setModalNovo(false); setItensSelecionados([]); setBuscaAtendimento(''); setDropdownAberto(false); }} className="flex-1 border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
              <button onClick={criarSolicitacao} disabled={salvando || !form.atendimentoId || itensSelecionados.length === 0} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">{salvando ? 'Salvando...' : 'Criar Solicitação'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
