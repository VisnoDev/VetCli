'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from '../../../../components/Toast';

function tocarAlerta() {
  // Vibração (funciona em Android; iOS não suporta via browser)
  if (navigator.vibrate) {
    navigator.vibrate([300, 100, 300, 100, 500]);
  }

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Compressor para som mais encorpado e alto
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 10;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.1;
    compressor.connect(ctx.destination);

    const tocarBeep = (frequencia: number, inicio: number, duracao: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(compressor);

      oscillator.frequency.value = frequencia;
      oscillator.type = 'square'; // mais agressivo que 'sine'

      gainNode.gain.setValueAtTime(0.8, ctx.currentTime + inicio);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);

      oscillator.start(ctx.currentTime + inicio);
      oscillator.stop(ctx.currentTime + inicio + duracao);
    };

    // Sequência mais chamativa: 4 beeps
    tocarBeep(880,  0,   0.25);
    tocarBeep(880,  0.3, 0.25);
    tocarBeep(1100, 0.6, 0.25);
    tocarBeep(1320, 0.9, 0.5);
  } catch (err) {
    console.warn('Audio não disponível', err);
  }
}

const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  SOLICITADO: { label: 'Solicitado', cor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  AMOSTRA_COLETADA: { label: 'Amostra Coletada', cor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  EM_PROCESSAMENTO: { label: 'Em Processamento', cor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  AGUARDANDO_VALIDACAO: { label: 'Aguardando Validação', cor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  LIBERADO: { label: 'Liberado', cor: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' },
  ENTREGUE: { label: 'Entregue', cor: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
};

const STATUS_FLUXO = ['SOLICITADO', 'AMOSTRA_COLETADA', 'EM_PROCESSAMENTO', 'AGUARDANDO_VALIDACAO', 'LIBERADO', 'ENTREGUE'];

const ETAPAS_PADRAO = [
  { nome: 'Coleta de amostra', duracaoSegundos: 300 },
  { nome: 'Centrifugação', duracaoSegundos: 600 },
  { nome: 'Incubação', duracaoSegundos: 1800 },
  { nome: 'Coloração de lâminas', duracaoSegundos: 900 },
  { nome: 'Tempo de coagulação', duracaoSegundos: 480 },
  { nome: 'Cultura bacteriana', duracaoSegundos: 86400 },
  { nome: 'Teste rápido', duracaoSegundos: 900 },
];

interface Timer {
  etapaId: string;
  nome: string;
  duracaoSegundos: number;
  iniciadoEm: Date;
  restante: number;
  concluido: boolean;
}

export default function LaboratorioDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [solicitacao, setSolicitacao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [modalResultado, setModalResultado] = useState<any>(null);
  const [modalTimer, setModalTimer] = useState(false);
  const [formResultado, setFormResultado] = useState({ resultado: '', valorReferencia: '', unidade: '', observacao: '' });
  const [timerCustom, setTimerCustom] = useState({ nome: '', duracaoSegundos: 300 });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/laboratorio/${id}`);
      setSolicitacao(res.data);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Tick dos timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (t.concluido) return t;
        const elapsed = (Date.now() - t.iniciadoEm.getTime()) / 1000;
        const restante = Math.max(0, t.duracaoSegundos - elapsed);
        if (restante === 0 && t.restante > 0) {
          tocarAlerta();
        }
        return { ...t, restante };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function atualizarStatus(status: string) {
    await api.patch(`/laboratorio/${id}/status`, { status });
    toast('Status atualizado.', 'success');
    await carregar();
  }

  async function iniciarTimer(nome: string, duracaoSegundos: number) {
    try {
      const res = await api.post('/laboratorio/etapa', {
        solicitacaoId: id,
        nome,
        duracaoSegundos,
      });
      const novoTimer: Timer = {
        etapaId: res.data.id,
        nome,
        duracaoSegundos,
        iniciadoEm: new Date(),
        restante: duracaoSegundos,
        concluido: false,
      };
      setTimers(prev => [...prev, novoTimer]);
      setModalTimer(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function concluirTimer(etapaId: string) {
    await api.patch(`/laboratorio/etapa/${etapaId}/concluir`);
    setTimers(prev => prev.map(t => t.etapaId === etapaId ? { ...t, concluido: true, restante: 0 } : t));
    await carregar();
  }

  function abrirModalResultado(item: any) {
    setModalResultado(item);
    setFormResultado({
      resultado: item.resultado || '',
      valorReferencia: item.valorReferencia || '',
      unidade: item.unidade || '',
      observacao: item.observacao || '',
    });
  }

  async function salvarResultado() {
    if (!modalResultado) return;
    setSalvando(true);
    try {
      await api.patch(`/laboratorio/item/${modalResultado.id}/resultado`, formResultado);
      toast('Resultado lançado com sucesso.', 'success');
      setModalResultado(null);
      await carregar();
    } finally { setSalvando(false); }
  }

  function formatarTempo(segundos: number) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function progressoTimer(timer: Timer) {
    return ((timer.duracaoSegundos - timer.restante) / timer.duracaoSegundos) * 100;
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  if (!solicitacao) return <div className="flex items-center justify-center h-64 text-gray-400">Solicitação não encontrada</div>;

  const status = STATUS_LABELS[solicitacao.status] ?? STATUS_LABELS.SOLICITADO;
  const statusIndex = STATUS_FLUXO.indexOf(solicitacao.status);
  const proximoStatus = STATUS_FLUXO[statusIndex + 1];
  const totalExames = solicitacao.itens.length;
  const examesConcluidos = solicitacao.itens.filter((i: any) => i.resultado).length;

  // Agrupar itens por categoria
  const itensPorCategoria = solicitacao.itens.reduce((acc: any, item: any) => {
    if (!acc[item.categoriaExame]) acc[item.categoriaExame] = [];
    acc[item.categoriaExame].push(item);
    return acc;
  }, {});

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/laboratorio')} className="text-gray-500 hover:text-brand-600 text-sm transition">← Laboratório</button>
      </div>

      {/* Info da solicitação */}
      <div className="card p-5 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-gray-400">{solicitacao.numero}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cor}`}>{status.label}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              🐾 {solicitacao.atendimento.paciente.nome}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {solicitacao.atendimento.paciente.especie} • Tutor: {solicitacao.atendimento.paciente.tutor.nome}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Veterinário: {solicitacao.atendimento.usuario.nome} • {new Date(solicitacao.createdAt).toLocaleDateString('pt-BR')}
            </p>
            {solicitacao.observacoes && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
                📋 {solicitacao.observacoes}
              </p>
            )}
          </div>

          {/* Progresso */}
          <div className="text-right">
            <p className="page-title">{examesConcluidos}/{totalExames}</p>
            <p className="text-xs text-gray-500">exames concluídos</p>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
              <div className="h-2 bg-brand-600 rounded-full transition-all" style={{ width: `${totalExames > 0 ? (examesConcluidos / totalExames) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Fluxo de status */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_FLUXO.map((s, i) => {
              const passado = i <= statusIndex;
              const atual = i === statusIndex;
              return (
                <div key={s} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${atual ? 'bg-brand-600 text-white' : passado ? 'bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {STATUS_LABELS[s]?.label}
                  </div>
                  {i < STATUS_FLUXO.length - 1 && <span className="text-gray-300 dark:text-gray-600">→</span>}
                </div>
              );
            })}
          </div>
          {proximoStatus && (
            <button onClick={() => atualizarStatus(proximoStatus)} className="mt-3 text-sm px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition">
              Avançar para: {STATUS_LABELS[proximoStatus]?.label} →
            </button>
          )}
        </div>
      </div>

      {/* Timers */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">⏱️ Timers de Processo</h2>
          <button onClick={() => setModalTimer(true)} className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700">+ Timer</button>
        </div>

        {timers.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum timer ativo. Inicie um processo para controlar o tempo.</p>
        ) : (
          <div className="space-y-3">
            {timers.map((timer) => (
              <div key={timer.etapaId} className={`border rounded-lg p-3 ${timer.concluido ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30' : timer.restante === 0 ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{timer.nome}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-mono font-bold ${timer.concluido ? 'text-green-600' : timer.restante === 0 ? 'text-red-600' : 'text-brand-600 dark:text-brand-400'}`}>
                      {timer.concluido ? '✅ Concluído' : timer.restante === 0 ? '⚠️ Tempo esgotado' : formatarTempo(timer.restante)}
                    </span>
                    {!timer.concluido && (
                      <button onClick={() => concluirTimer(timer.etapaId)} className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200">
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
                {!timer.concluido && (
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className={`h-1.5 rounded-full transition-all ${timer.restante === 0 ? 'bg-red-500' : 'bg-brand-500'}`}
                      style={{ width: `${progressoTimer(timer)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exames por categoria */}
      <div className="space-y-3">
        {Object.entries(itensPorCategoria).map(([categoria, itens]: [string, any]) => (
          <div key={categoria} className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{categoria}</h3>
              <span className="text-xs text-gray-500">{itens.filter((i: any) => i.resultado).length}/{itens.length}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map((item: any) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.nomeExame}</p>
                    {item.resultado ? (
                      <div className="mt-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                          {item.resultado} {item.unidade && <span className="text-gray-500">{item.unidade}</span>}
                        </span>
                        {item.valorReferencia && (
                          <span className="text-xs text-gray-400 ml-2">Ref: {item.valorReferencia}</span>
                        )}
                        {item.observacao && <p className="text-xs text-gray-500 mt-0.5">{item.observacao}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Aguardando resultado</p>
                    )}
                  </div>
                  <button onClick={() => abrirModalResultado(item)} className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap ${item.resultado ? 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                    {item.resultado ? 'Editar' : 'Lançar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Histórico de etapas */}
      {solicitacao.etapas.length > 0 && (
        <div className="mt-4 card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📋 Histórico de Etapas</h3>
          <div className="space-y-2">
            {solicitacao.etapas.map((etapa: any) => (
              <div key={etapa.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{etapa.nome}</span>
                  {etapa.usuario && <span className="text-gray-500 ml-2">• {etapa.usuario.nome}</span>}
                </div>
                <div className="text-right text-xs text-gray-400">
                  {etapa.concluidoEm ? (
                    <span className="text-green-600 dark:text-green-400">
                      ✅ {Math.round((new Date(etapa.concluidoEm).getTime() - new Date(etapa.iniciadoEm).getTime()) / 1000)}s
                    </span>
                  ) : (
                    <span className="text-amber-600">Em andamento</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal lançar resultado */}
      {modalResultado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Lançar Resultado</h2>
              <button onClick={() => setModalResultado(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm font-medium text-brand-600 dark:text-brand-400 mb-4">💊 {modalResultado.nomeExame}</p>
            <div className="space-y-3">
              <div>
                <label className="label">Resultado *</label>
                <input type="text" value={formResultado.resultado} onChange={(e) => setFormResultado({ ...formResultado, resultado: e.target.value })} placeholder="Ex: 5.2, Positivo, Negativo..." className="w-full input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Unidade</label>
                  <input type="text" value={formResultado.unidade} onChange={(e) => setFormResultado({ ...formResultado, unidade: e.target.value })} placeholder="Ex: mg/dL, U/L..." className="w-full input" />
                </div>
                <div>
                  <label className="label">Valor de referência</label>
                  <input type="text" value={formResultado.valorReferencia} onChange={(e) => setFormResultado({ ...formResultado, valorReferencia: e.target.value })} placeholder="Ex: 3.5 - 5.5" className="w-full input" />
                </div>
              </div>
              <div>
                <label className="label">Observação</label>
                <textarea value={formResultado.observacao} onChange={(e) => setFormResultado({ ...formResultado, observacao: e.target.value })} rows={2} placeholder="Observações do laboratório..." className="w-full input" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalResultado(null)} className="flex-1 border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
              <button onClick={salvarResultado} disabled={salvando || !formResultado.resultado} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo timer */}
      {modalTimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">⏱️ Novo Timer</h2>
              <button onClick={() => setModalTimer(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Etapas rápidas:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {ETAPAS_PADRAO.map((etapa) => (
                <button key={etapa.nome} onClick={() => iniciarTimer(etapa.nome, etapa.duracaoSegundos)} className="text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-brand-50 dark:hover:bg-brand-950 hover:border-brand-300 transition text-gray-700 dark:text-gray-300">
                  <p className="font-medium">{etapa.nome}</p>
                  <p className="text-gray-400">{formatarTempo(etapa.duracaoSegundos)}</p>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Timer personalizado:</p>
              <div className="space-y-3">
                <input type="text" value={timerCustom.nome} onChange={(e) => setTimerCustom({ ...timerCustom, nome: e.target.value })} placeholder="Nome do processo..." className="w-full input" />
                <div className="flex gap-2 items-center">
                  <input type="number" value={timerCustom.duracaoSegundos} onChange={(e) => setTimerCustom({ ...timerCustom, duracaoSegundos: Number(e.target.value) })} className="flex-1 input" />
                  <span className="text-sm text-gray-500">segundos</span>
                </div>
                <button onClick={() => iniciarTimer(timerCustom.nome, timerCustom.duracaoSegundos)} disabled={!timerCustom.nome || timerCustom.duracaoSegundos <= 0} className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-700">
                  Iniciar Timer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
