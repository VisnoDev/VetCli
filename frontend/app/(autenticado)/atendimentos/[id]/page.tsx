'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from '../../../../components/Toast';
import { can, getStoredRole } from '../../../../lib/permissions';

interface Atendimento {
  id: string;
  createdAt: string;
  queixa?: string;
  diagnostico?: string;
  observacoes?: string;
  paciente: {
    id: string;
    nome: string;
    especie: string;
    raca?: string;
    sexo?: string;
    peso?: number;
    tutor: { id: string; nome: string; telefone?: string; email?: string };
  };
  usuario: { id: string; nome: string; role: string };
  prescricoes: {
    id: string;
    createdAt: string;
    itens: {
      id: string;
      dosagem?: string;
      frequencia?: string;
      duracao?: string;
      instrucoes?: string;
      medicamento: { id: string; nome: string };
      variante?: { concentracao: string; apresentacao?: string };
    }[];
  }[];
  solicitacoesExame: {
    id: string;
    numero: string;
    status: string;
    createdAt: string;
    itens: { id: string; nomeExame: string; categoriaExame: string; status: string; resultado?: string }[];
  }[];
}

const especieEmoji: Record<string, string> = {
  Cão: '🐶', Gato: '🐱', Ave: '🐦', Coelho: '🐰', Hamster: '🐹', Réptil: '🦎', Outro: '🐾',
};

const statusExameBadge: Record<string, string> = {
  SOLICITADO: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  AMOSTRA_COLETADA: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  EM_PROCESSAMENTO: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  AGUARDANDO_VALIDACAO: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  LIBERADO: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  ENTREGUE: 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300',
};

const statusExameLabel: Record<string, string> = {
  SOLICITADO: 'Solicitado',
  AMOSTRA_COLETADA: 'Amostra Coletada',
  EM_PROCESSAMENTO: 'Em Processamento',
  AGUARDANDO_VALIDACAO: 'Aguardando Validação',
  LIBERADO: 'Liberado',
  ENTREGUE: 'Entregue',
};

export default function AtendimentoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];

  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ queixa: '', diagnostico: '', observacoes: '' });
  const [salvando, setSalvando] = useState(false);

  const role = getStoredRole();
  const podeEditar = can(role, 'atendimentos:write');
  const podeVerPrescricoes = can(role, 'prescricoes:read');
  const podeVerLab = can(role, 'laboratorio:read');

  useEffect(() => {
    if (!id) return;
    carregar();
  }, [id]);

  async function carregar() {
    setLoading(true);
    try {
      const res = await api.get(`/atendimentos/${id}`);
      setAtendimento(res.data);
      setForm({
        queixa: res.data.queixa || '',
        diagnostico: res.data.diagnostico || '',
        observacoes: res.data.observacoes || '',
      });
    } finally {
      setLoading(false);
    }
  }

  async function salvarEdicao() {
    if (!atendimento) return;
    setSalvando(true);
    try {
      await api.patch(`/atendimentos/${atendimento.id}`, {
        queixa: form.queixa || undefined,
        diagnostico: form.diagnostico || undefined,
        observacoes: form.observacoes || undefined,
      });
      toast('Dados clínicos salvos.', 'success');
      setEditando(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  if (!atendimento) return <div className="flex items-center justify-center h-64 text-gray-400">Atendimento não encontrado</div>;

  const p = atendimento.paciente;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button onClick={() => router.push('/atendimentos')} className="hover:text-brand-600 transition">
          ← Atendimentos
        </button>
        <span>/</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium">
          {new Date(atendimento.createdAt).toLocaleDateString('pt-BR')} — {p.nome}
        </span>
      </div>

      {/* Card do paciente */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{especieEmoji[p.especie] || '🐾'}</div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{p.nome}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {p.especie}{p.raca ? ` • ${p.raca}` : ''}{p.sexo ? ` • ${p.sexo}` : ''}{p.peso ? ` • ${p.peso}kg` : ''}
                </p>
              </div>
              <button
                onClick={() => router.push(`/pacientes/${p.id}`)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                Ver prontuário →
              </button>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 mt-3 pt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>👤 Tutor: <strong className="text-gray-700 dark:text-gray-300">{p.tutor.nome}</strong></span>
              {p.tutor.telefone && <span>📞 {p.tutor.telefone}</span>}
              <span>🩺 Veterinário: <strong className="text-gray-700 dark:text-gray-300">{atendimento.usuario.nome}</strong></span>
              <span>📅 {new Date(atendimento.createdAt).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dados clínicos */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">📋 Dados Clínicos</h3>
          {!editando ? (
            podeEditar && (
              <button
                onClick={() => setEditando(true)}
                className="text-sm text-brand-600 hover:text-brand-800 font-medium"
              >
                Editar
              </button>
            )
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditando(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvando}
                className="text-sm text-brand-600 hover:text-brand-800 font-medium disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {editando ? (
          <div className="space-y-3">
            <div>
              <label className="label">Queixa principal</label>
              <textarea
                value={form.queixa}
                onChange={(e) => setForm({ ...form, queixa: e.target.value })}
                rows={2}
                className="w-full input resize-none"
              />
            </div>
            <div>
              <label className="label">Diagnóstico</label>
              <textarea
                value={form.diagnostico}
                onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
                rows={2}
                className="w-full input resize-none"
              />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
                className="w-full input resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Queixa: </span>
              <span className="text-gray-800 dark:text-gray-200">{atendimento.queixa || <em className="text-gray-400">não informada</em>}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Diagnóstico: </span>
              <span className="text-gray-800 dark:text-gray-200">{atendimento.diagnostico || <em className="text-gray-400">não informado</em>}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Observações: </span>
              <span className="text-gray-800 dark:text-gray-200">{atendimento.observacoes || <em className="text-gray-400">nenhuma</em>}</span>
            </div>
          </div>
        )}
      </div>

      {/* Prescrições */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">💊 Prescrições ({atendimento.prescricoes.length})</h3>
          {podeVerPrescricoes && (
            <button
              onClick={() => router.push('/prescricoes')}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              Gerenciar prescrições →
            </button>
          )}
        </div>

        {atendimento.prescricoes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma prescrição vinculada</p>
        ) : (
          <div className="space-y-3">
            {atendimento.prescricoes.map((pres) => (
              <div key={pres.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{new Date(pres.createdAt).toLocaleString('pt-BR')}</span>
                  {podeVerPrescricoes && (
                    <button
                      onClick={() => router.push(`/prescricoes/${atendimento.id}`)}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    >
                      Ver completa →
                    </button>
                  )}
                </div>
                <ul className="space-y-1">
                  {pres.itens.map((item) => (
                    <li key={item.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-brand-500 mt-0.5">•</span>
                      <span>
                        <strong>{item.medicamento.nome}</strong>
                        {item.variante && <span className="text-gray-400"> {item.variante.concentracao}</span>}
                        {item.dosagem && ` — ${item.dosagem}`}
                        {item.frequencia && ` • ${item.frequencia}`}
                        {item.duracao && ` • ${item.duracao}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exames */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">🔬 Exames ({atendimento.solicitacoesExame.length})</h3>
          {podeVerLab && (
            <button
              onClick={() => router.push('/laboratorio')}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              Gerenciar exames →
            </button>
          )}
        </div>

        {atendimento.solicitacoesExame.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhum exame solicitado</p>
        ) : (
          <div className="space-y-3">
            {atendimento.solicitacoesExame.map((sol) => (
              <div key={sol.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">#{sol.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusExameBadge[sol.status] || ''}`}>
                      {statusExameLabel[sol.status] || sol.status}
                    </span>
                  </div>
                  {podeVerLab && <button
                    onClick={() => router.push(`/laboratorio/${sol.id}`)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Ver detalhes →
                  </button>}
                </div>
                <ul className="space-y-0.5">
                  {sol.itens.map((item) => (
                    <li key={item.id} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>•</span>
                      <span>{item.nomeExame}</span>
                      {item.resultado && <span className="text-green-600 dark:text-green-400 font-medium">→ {item.resultado}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
