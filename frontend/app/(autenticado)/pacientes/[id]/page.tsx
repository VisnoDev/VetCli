'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from '../../../../components/Toast';
import { can, getStoredRole } from '../../../../lib/permissions';

interface Paciente {
  id: string;
  nome: string;
  especie: string;
  raca?: string;
  sexo?: string;
  peso?: number;
  dataNasc?: string;
  alergias?: string;
  tutor: { id: string; nome: string; telefone?: string; email?: string };
}

interface Atendimento {
  id: string;
  createdAt: string;
  queixa?: string;
  diagnostico?: string;
  observacoes?: string;
  usuario: { nome: string; role: string };
  prescricoes: {
    itens: {
      dosagem?: string;
      frequencia?: string;
      duracao?: string;
      medicamento: { nome: string };
    }[];
  }[];
}

interface ExameLab {
  id: string;
  numero: string;
  status: string;
  createdAt: string;
  itens: { id: string; nomeExame: string; resultado?: string }[];
  atendimento: { usuario: { nome: string } };
}

interface Vacinacao {
  id: string;
  vacina: string;
  fabricante?: string;
  lote?: string;
  dataAplicacao: string;
  dataVencimento?: string;
  usuario?: { nome: string };
}

const especieEmoji: Record<string, string> = {
  Cão: '🐶', Gato: '🐱', Ave: '🐦', Coelho: '🐰', Hamster: '🐹', Réptil: '🦎', Outro: '🐾',
};

const formVacinaVazio = { vacina: '', fabricante: '', lote: '', dataAplicacao: '', dataVencimento: '' };

export default function PacienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [historico, setHistorico] = useState<Atendimento[]>([]);
  const [vacinacoes, setVacinacoes] = useState<Vacinacao[]>([]);
  const [examesLab, setExamesLab] = useState<ExameLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAberta, setAbaAberta] = useState<string | null>(null);
  const [modalVacina, setModalVacina] = useState(false);
  const [formVacina, setFormVacina] = useState(formVacinaVazio);
  const [salvandoVacina, setSalvandoVacina] = useState(false);

  useEffect(() => {
    if (!id) return;
    carregarDados();
  }, [id]);

  const role = getStoredRole();
  const podeVerVacinas = can(role, 'vacinacoes:read');
  const podeVerLab = can(role, 'laboratorio:read');
  const podeEditarVacinas = can(role, 'vacinacoes:write');

  async function carregarDados() {
    setLoading(true);
    try {
      const [pacRes, histRes] = await Promise.all([
        api.get(`/pacientes/${id}`),
        api.get(`/pacientes/${id}/historico`),
      ]);
      setPaciente(pacRes.data);
      setHistorico(histRes.data);
      // Seções secundárias: só busca o que o cargo pode ver.
      if (podeVerVacinas) {
        const vacRes = await api.get(`/vacinacoes/paciente/${id}`);
        setVacinacoes(vacRes.data);
      }
      if (podeVerLab) {
        const labRes = await api.get(`/laboratorio/paciente/${id}`);
        setExamesLab(labRes.data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function salvarVacina() {
    if (!formVacina.vacina || !formVacina.dataAplicacao || !id) return;
    setSalvandoVacina(true);
    try {
      await api.post('/vacinacoes', {
        pacienteId: id,
        vacina: formVacina.vacina,
        fabricante: formVacina.fabricante || undefined,
        lote: formVacina.lote || undefined,
        dataAplicacao: formVacina.dataAplicacao,
        dataVencimento: formVacina.dataVencimento || undefined,
      });
      toast('Vacina registrada com sucesso.', 'success');
      setModalVacina(false);
      setFormVacina(formVacinaVazio);
      carregarDados();
    } finally {
      setSalvandoVacina(false);
    }
  }

  async function excluirVacina(vacinaId: string) {
    if (!confirm('Excluir este registro de vacina?')) return;
    await api.delete(`/vacinacoes/${vacinaId}`);
    toast('Vacina removida.', 'success');
    carregarDados();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  if (!paciente) return <div className="flex items-center justify-center h-64 text-gray-400">Paciente não encontrado</div>;

  const idade = paciente.dataNasc
    ? Math.floor((Date.now() - new Date(paciente.dataNasc).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  const vacinasVencidas = vacinacoes.filter(
    (v) => v.dataVencimento && new Date(v.dataVencimento) < new Date()
  );
  const vacinasProximas = vacinacoes.filter(
    (v) => v.dataVencimento && new Date(v.dataVencimento) >= new Date() &&
      new Date(v.dataVencimento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/pacientes')} className="text-gray-500 hover:text-brand-600 transition text-sm">← Pacientes</button>
      </div>

      {/* Card do paciente */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-6xl">{especieEmoji[paciente.especie] || '🐾'}</div>
          <div className="flex-1">
            <h1 className="page-title">{paciente.nome}</h1>
            <p className="text-gray-500 dark:text-gray-400">{paciente.especie}{paciente.raca ? ` • ${paciente.raca}` : ''}{paciente.sexo ? ` • ${paciente.sexo}` : ''}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              {paciente.peso && (
                <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full font-medium">⚖️ {paciente.peso}kg</span>
              )}
              {idade !== null && (
                <span className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs px-3 py-1 rounded-full font-medium">🎂 {idade} ano{idade !== 1 ? 's' : ''}</span>
              )}
              <span className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs px-3 py-1 rounded-full font-medium">📋 {historico.length} atendimento{historico.length !== 1 ? 's' : ''}</span>
              <span className="bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs px-3 py-1 rounded-full font-medium">💉 {vacinacoes.length} vacina{vacinacoes.length !== 1 ? 's' : ''}</span>
              <span className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs px-3 py-1 rounded-full font-medium">🔬 {examesLab.length} exam{examesLab.length !== 1 ? 'es' : 'e'} lab.</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tutor</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{paciente.tutor.nome}</p>
          <div className="flex gap-4 mt-1">
            {paciente.tutor.telefone && <p className="text-sm text-gray-500 dark:text-gray-400">📞 {paciente.tutor.telefone}</p>}
            {paciente.tutor.email && <p className="text-sm text-gray-500 dark:text-gray-400">✉️ {paciente.tutor.email}</p>}
          </div>
        </div>

        {/* Alergias — destaque vermelho */}
        {paciente.alergias && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">⚠️ Alergias / Intolerâncias</p>
            <p className="text-sm text-red-800 dark:text-red-300">{paciente.alergias}</p>
          </div>
        )}
      </div>

      {/* Alertas de vacinas */}
      {(vacinasVencidas.length > 0 || vacinasProximas.length > 0) && (
        <div className="mb-6 space-y-2">
          {vacinasVencidas.map((v) => (
            <div key={v.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2 text-sm text-red-700 dark:text-red-300">
              <span>⚠️</span>
              <span>Vacina <strong>{v.vacina}</strong> vencida em {new Date(v.dataVencimento!).toLocaleDateString('pt-BR')}</span>
            </div>
          ))}
          {vacinasProximas.map((v) => (
            <div key={v.id} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
              <span>🔔</span>
              <span>Vacina <strong>{v.vacina}</strong> vence em {new Date(v.dataVencimento!).toLocaleDateString('pt-BR')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Seção Vacinas */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">💉 Vacinas ({vacinacoes.length})</h2>
          {podeEditarVacinas && (
            <button
              onClick={() => { setFormVacina(formVacinaVazio); setModalVacina(true); }}
              className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              + Registrar
            </button>
          )}
        </div>

        {vacinacoes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma vacina registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Vacina', 'Fabricante', 'Lote', 'Aplicação', 'Vencimento', 'Veterinário', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vacinacoes.map((v) => {
                  const vencida = v.dataVencimento && new Date(v.dataVencimento) < new Date();
                  const proxima = v.dataVencimento && !vencida && new Date(v.dataVencimento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{v.vacina}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{v.fabricante || '-'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{v.lote || '-'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(v.dataAplicacao).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {v.dataVencimento ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vencida ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : proxima ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'}`}>
                            {new Date(v.dataVencimento).toLocaleDateString('pt-BR')}
                            {vencida && ' ⚠️'}
                            {proxima && ' 🔔'}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{v.usuario?.nome || '-'}</td>
                      <td className="px-3 py-2">
                        {podeEditarVacinas && <button onClick={() => excluirVacina(v.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Excluir</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção Laboratório */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">🔬 Laboratório ({examesLab.length})</h2>
          <button
            onClick={() => router.push('/laboratorio')}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium transition"
          >
            Ver todos →
          </button>
        </div>

        {examesLab.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma solicitação de exame registrada</p>
        ) : (
          <div className="space-y-2">
            {examesLab.map((s) => {
              const statusCor: Record<string, string> = {
                SOLICITADO: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                AMOSTRA_COLETADA: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
                EM_PROCESSAMENTO: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
                AGUARDANDO_VALIDACAO: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
                LIBERADO: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
                ENTREGUE: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              };
              const statusLabel: Record<string, string> = {
                SOLICITADO: 'Solicitado', AMOSTRA_COLETADA: 'Amostra Coletada',
                EM_PROCESSAMENTO: 'Em Processamento', AGUARDANDO_VALIDACAO: 'Aguardando Validação',
                LIBERADO: 'Liberado', ENTREGUE: 'Entregue',
              };
              const comResultado = s.itens.filter((i) => i.resultado).length;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-gray-400">{s.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCor[s.status] ?? statusCor.SOLICITADO}`}>
                        {statusLabel[s.status] ?? s.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {s.itens.length} exame{s.itens.length !== 1 ? 's' : ''}
                      {comResultado > 0 && <span className="text-green-600 dark:text-green-400"> • {comResultado} com resultado</span>}
                      <span className="text-gray-400"> • {new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span className="text-gray-400"> • {s.atendimento.usuario.nome}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.itens.slice(0, 4).map((item) => (
                        <span key={item.id} className={`text-xs px-1.5 py-0.5 rounded ${item.resultado ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          {item.nomeExame}
                        </span>
                      ))}
                      {s.itens.length > 4 && <span className="text-xs text-gray-400">+{s.itens.length - 4}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/laboratorio/${s.id}`)}
                    className="text-sm text-brand-600 hover:text-brand-800 font-medium whitespace-nowrap flex-shrink-0"
                  >
                    Ver →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico de atendimentos */}
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">📋 Histórico de Atendimentos</h2>

      {historico.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          Nenhum atendimento registrado ainda
        </div>
      ) : (
        <div className="space-y-3">
          {historico.map((a) => (
            <div key={a.id} className="card overflow-hidden">
              <button
                onClick={() => setAbaAberta(abaAberta === a.id ? null : a.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {a.diagnostico || 'Sem diagnóstico'} • {a.usuario.nome}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-1 rounded-full">
                    {a.prescricoes[0]?.itens?.length || 0} med.
                  </span>
                  <span className="text-gray-400">{abaAberta === a.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {abaAberta === a.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-3">
                  {a.queixa && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Queixa:</strong> {a.queixa}</p>}
                  {a.diagnostico && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Diagnóstico:</strong> {a.diagnostico}</p>}
                  {a.observacoes && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Obs:</strong> {a.observacoes}</p>}

                  {a.prescricoes[0]?.itens?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">💊 Medicamentos:</p>
                      <ul className="space-y-1">
                        {a.prescricoes[0].itens.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-brand-500 mt-0.5">•</span>
                            <span>
                              <strong>{item.medicamento.nome}</strong>
                              {item.dosagem && ` — ${item.dosagem}`}
                              {item.frequencia && ` • ${item.frequencia}`}
                              {item.duracao && ` • ${item.duracao}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => router.push(`/prescricoes/${a.id}`)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Ver prescrição completa →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nova vacina */}
      {modalVacina && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">💉 Registrar Vacina</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Vacina *</label>
                <input
                  type="text"
                  value={formVacina.vacina}
                  onChange={(e) => setFormVacina({ ...formVacina, vacina: e.target.value })}
                  placeholder="Ex: V8, Antirrábica, Gripe..."
                  className="w-full input"
                />
              </div>
              <div>
                <label className="label">Fabricante</label>
                <input
                  type="text"
                  value={formVacina.fabricante}
                  onChange={(e) => setFormVacina({ ...formVacina, fabricante: e.target.value })}
                  placeholder="Ex: Zoetis, MSD..."
                  className="w-full input"
                />
              </div>
              <div>
                <label className="label">Lote</label>
                <input
                  type="text"
                  value={formVacina.lote}
                  onChange={(e) => setFormVacina({ ...formVacina, lote: e.target.value })}
                  placeholder="Número do lote"
                  className="w-full input"
                />
              </div>
              <div>
                <label className="label">Data de Aplicação *</label>
                <input
                  type="date"
                  value={formVacina.dataAplicacao}
                  onChange={(e) => setFormVacina({ ...formVacina, dataAplicacao: e.target.value })}
                  className="w-full input"
                />
              </div>
              <div>
                <label className="label">Data de Vencimento</label>
                <input
                  type="date"
                  value={formVacina.dataVencimento}
                  onChange={(e) => setFormVacina({ ...formVacina, dataVencimento: e.target.value })}
                  className="w-full input"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalVacina(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarVacina}
                disabled={salvandoVacina || !formVacina.vacina || !formVacina.dataAplicacao}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {salvandoVacina ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
