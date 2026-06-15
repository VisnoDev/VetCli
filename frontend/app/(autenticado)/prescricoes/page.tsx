'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import BuscaSelect from '../../../components/BuscaSelect';

interface Medicamento {
  id: string;
  nome: string;
  categoria?: string;
  principioAtivo?: string;
  variantes: { id: string; concentracao: string; apresentacao?: string }[];
}

interface ItemPrescricao {
  medicamentoId: string;
  medicamentoVarianteId: string;
  medicamento?: Medicamento;
  dosagem: string;
  frequencia: string;
  duracao: string;
  instrucoes: string;
}

interface Interacao {
  id: string;
  tipo: string;
  severidade: string;
  descricao: string;
  medicamentoA: { nome: string };
  medicamentoB: { nome: string };
}

interface AtendimentoRow {
  id: string;
  createdAt: string;
  diagnostico?: string;
  paciente: { nome: string; tutor: { nome: string } };
  prescricoes?: { itens?: unknown[] }[];
}

export default function PrescricoesPage() {
  const router = useRouter();
  type PacienteOpt = { id: string; nome: string; especie: string; alergias?: string; tutor: { nome: string } };
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteOpt | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [searchMed, setSearchMed] = useState('');
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [form, setForm] = useState({ queixa: '', diagnostico: '', observacoes: '' });
  const [itens, setItens] = useState<ItemPrescricao[]>([]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const atRes = await api.get<AtendimentoRow[]>('/prescricoes');
      setAtendimentos(atRes.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  async function buscarMedicamentos(s: string) {
    setSearchMed(s);
    if (s.length < 2) { setMedicamentos([]); return; }
    const res = await api.get<Medicamento[]>('/prescricoes/medicamentos', { params: { search: s } });
    setMedicamentos(res.data);
  }

  async function verificarInteracoes(ids: string[]) {
    if (ids.length < 2) { setInteracoes([]); return; }
    const res = await api.get<Interacao[]>('/prescricoes/interacoes', { params: { ids: ids.join(',') } });
    setInteracoes(res.data);
  }

  function adicionarItem(med: Medicamento) {
    const novoItem: ItemPrescricao = { medicamentoId: med.id, medicamentoVarianteId: med.variantes[0]?.id ?? '', medicamento: med, dosagem: '', frequencia: '', duracao: '', instrucoes: '' };
    const novosItens = [...itens, novoItem];
    setItens(novosItens);
    setSearchMed('');
    setMedicamentos([]);
    void verificarInteracoes(novosItens.map((i) => i.medicamentoId));
  }

  function removerItem(index: number) {
    const novosItens = itens.filter((_, i) => i !== index);
    setItens(novosItens);
    void verificarInteracoes(novosItens.map((i) => i.medicamentoId));
  }

  function atualizarItem(index: number, campo: keyof ItemPrescricao, valor: string) {
    setItens((prev) => { const n = [...prev]; n[index] = { ...n[index], [campo]: valor } as ItemPrescricao; return n; });
  }

  async function buscarPacientes(query: string) {
    const res = await api.get('/pacientes', { params: { search: query, limit: 10 } });
    return res.data.data as { id: string; nome: string; especie: string; alergias?: string; tutor: { nome: string } }[];
  }

  async function salvar() {
    if (!selectedPaciente || itens.length === 0) return;
    setSalvando(true);
    try {
      await api.post('/prescricoes', {
        pacienteId: selectedPaciente.id,
        ...form,
        itens: itens.map(({ medicamentoId, medicamentoVarianteId, dosagem, frequencia, duracao, instrucoes }) => ({ medicamentoId, medicamentoVarianteId: medicamentoVarianteId || null, dosagem, frequencia, duracao, instrucoes })),
      });
      toast('Prescrição registrada com sucesso.', 'success');
      setModalAberto(false);
      setSelectedPaciente(null);
      setForm({ queixa: '', diagnostico: '', observacoes: '' });
      setItens([]);
      setInteracoes([]);
      await carregarDados();
    } finally { setSalvando(false); }
  }

  const severidadeCor: Record<string, string> = {
    GRAVE: 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300',
    MODERADA: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    LEVE: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">💊 Prescrições</h1>
        <button type="button" onClick={() => setModalAberto(true)} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Nova Prescrição
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : atendimentos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma prescrição cadastrada</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Data', 'Paciente', 'Tutor', 'Diagnóstico', 'Medicamentos', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {atendimentos.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{a.paciente.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.paciente.tutor.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.diagnostico || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.prescricoes?.[0]?.itens?.length || 0} medicamento(s)</td>
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={() => router.push(`/prescricoes/${a.id}`)} className="text-brand-600 hover:text-brand-800 font-medium">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl p-6 my-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Nova Prescrição</h2>
            <div className="space-y-3 mb-4">
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
              {selectedPaciente?.alergias && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-0.5">⚠️ Paciente tem alergias registradas</p>
                  <p className="text-sm text-red-800 dark:text-red-300">{selectedPaciente.alergias}</p>
                </div>
              )}
              <div>
                <label className="label">Queixa Principal</label>
                <input type="text" value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} placeholder="Ex: Dor abdominal, vômito..." className="w-full input" />
              </div>
              <div>
                <label className="label">Diagnóstico</label>
                <input type="text" value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} placeholder="Ex: Gastroenterite aguda..." className="w-full input" />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Buscar medicamento</label>
              <div className="relative">
                <input type="text" value={searchMed} onChange={(e) => void buscarMedicamentos(e.target.value)} placeholder="Ex: tramadol, amoxicilina..." className="w-full input" />
                {medicamentos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {medicamentos.map((med) => (
                      <button key={med.id} type="button" onClick={() => adicionarItem(med)} className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-950 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="font-medium">{med.nome}</span>
                        {med.principioAtivo && <span className="text-gray-500 text-xs ml-2">· {med.principioAtivo}</span>}
                        <span className="text-gray-400 text-xs ml-2">{med.categoria}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {interacoes.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">⚠️ Interações detectadas:</p>
                {interacoes.map((i) => (
                  <div key={i.id} className={`border rounded-lg px-3 py-2 text-xs ${severidadeCor[i.severidade] ?? 'border-gray-200'}`}>
                    <strong>{i.medicamentoA.nome} + {i.medicamentoB.nome}</strong> — {i.severidade}
                    <p className="mt-1">{i.descricao}</p>
                  </div>
                ))}
              </div>
            )}

            {itens.length > 0 && (
              <div className="mb-4 space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Medicamentos prescritos:</p>
                {itens.map((item, index) => (
                  <div key={`${item.medicamentoId}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">💊 {item.medicamento?.nome}</span>
                      <button type="button" onClick={() => removerItem(index)} className="text-red-500 hover:text-red-700 text-xs">Remover</button>
                    </div>
                    {item.medicamento && item.medicamento.variantes.length > 0 && (
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Apresentação / concentração</label>
                        <select value={item.medicamentoVarianteId} onChange={(e) => atualizarItem(index, 'medicamentoVarianteId', e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500">
                          {item.medicamento.variantes.map((v) => <option key={v.id} value={v.id}>{v.concentracao}{v.apresentacao ? ` — ${v.apresentacao}` : ''}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400">Dosagem</label>
                          <button type="button" onClick={() => atualizarItem(index, 'dosagem', '')} className="text-[10px] text-brand-600 hover:underline">Limpar</button>
                        </div>
                        <input type="text" value={item.dosagem} onChange={(e) => atualizarItem(index, 'dosagem', e.target.value)} placeholder="Ex: 1 comprimido" className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Frequência</label>
                        <input type="text" value={item.frequencia} onChange={(e) => atualizarItem(index, 'frequencia', e.target.value)} placeholder="Ex: A cada 8h" className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duração</label>
                        <input type="text" value={item.duracao} onChange={(e) => atualizarItem(index, 'duracao', e.target.value)} placeholder="Ex: 7 dias" className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Instruções</label>
                        <input type="text" value={item.instrucoes} onChange={(e) => atualizarItem(index, 'instrucoes', e.target.value)} placeholder="Ex: Dar com alimento" className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="label">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações gerais..." rows={2} className="w-full input" />
            </div>

            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => { setModalAberto(false); setSelectedPaciente(null); setItens([]); setInteracoes([]); }} className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button type="button" onClick={() => void salvar()} disabled={salvando || !selectedPaciente || itens.length === 0} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-2 rounded-lg text-sm font-medium transition">{salvando ? 'Salvando...' : 'Salvar prescrição'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}