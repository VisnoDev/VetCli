'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';

interface Variante {
  id: string;
  concentracao: string;
  apresentacao?: string;
}

interface Item {
  dosagem?: string;
  frequencia?: string;
  duracao?: string;
  instrucoes?: string;
  medicamento: { nome: string; principioAtivo?: string };
  variante?: Variante | null;
}

interface AtendimentoDetalhe {
  id: string;
  createdAt: string;
  queixa?: string;
  diagnostico?: string;
  observacoes?: string;
  clinica: { nome: string; telefone?: string; endereco?: string };
  usuario: { nome: string };
  paciente: {
    nome: string;
    especie: string;
    raca?: string;
    tutor: { nome: string; telefone?: string };
  };
  prescricoes: { observacoes?: string; itens: Item[] }[];
}

function montarTextoReceita(a: AtendimentoDetalhe): string {
  const linhas: string[] = [];
  linhas.push('RECEITUÁRIO VETERINÁRIO');
  linhas.push('');
  linhas.push(`Clínica: ${a.clinica.nome}`);
  if (a.clinica.telefone) linhas.push(`Tel.: ${a.clinica.telefone}`);
  if (a.clinica.endereco) linhas.push(a.clinica.endereco);
  linhas.push('');
  linhas.push(`Data: ${new Date(a.createdAt).toLocaleString('pt-BR')}`);
  linhas.push(`Veterinário(a): ${a.usuario.nome}`);
  linhas.push('');
  linhas.push(`Paciente: ${a.paciente.nome} (${a.paciente.especie}${a.paciente.raca ? `, ${a.paciente.raca}` : ''})`);
  linhas.push(`Tutor: ${a.paciente.tutor.nome}${a.paciente.tutor.telefone ? ` — ${a.paciente.tutor.telefone}` : ''}`);
  if (a.queixa) linhas.push(`Queixa: ${a.queixa}`);
  if (a.diagnostico) linhas.push(`Diagnóstico: ${a.diagnostico}`);
  linhas.push('');
  linhas.push('Medicamentos:');
  const itens = a.prescricoes[0]?.itens ?? [];
  itens.forEach((it, i) => {
    const ap = it.variante ? `${it.variante.concentracao}${it.variante.apresentacao ? ` (${it.variante.apresentacao})` : ''}` : '';
    linhas.push(`${i + 1}. ${it.medicamento.nome}${ap ? ` — ${ap}` : ''}`);
    if (it.dosagem) linhas.push(`   Dosagem: ${it.dosagem}`);
    if (it.frequencia) linhas.push(`   Frequência: ${it.frequencia}`);
    if (it.duracao) linhas.push(`   Duração: ${it.duracao}`);
    if (it.instrucoes) linhas.push(`   Instruções: ${it.instrucoes}`);
  });
  const obs = a.prescricoes[0]?.observacoes || a.observacoes;
  if (obs) { linhas.push(''); linhas.push(`Obs.: ${obs}`); }
  return linhas.join('\n');
}

export default function PrescricaoDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [data, setData] = useState<AtendimentoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<AtendimentoDetalhe>(`/prescricoes/${id}`);
      setData(res.data);
      setErro(null);
    } catch {
      setErro('Não foi possível carregar esta prescrição.');
    }
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function copiar() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(montarTextoReceita(data));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { setErro('Não foi possível copiar.'); }
  }

  if (erro && !data) return (
    <div className="p-8">
      <p className="text-red-600 dark:text-red-400">{erro}</p>
      <button type="button" onClick={() => router.push('/prescricoes')} className="mt-4 text-brand-600 text-sm">← Voltar às prescrições</button>
    </div>
  );

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>;

  const itens = data.prescricoes[0]?.itens ?? [];

  return (
    <div>
      {/* Botões de ação */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 no-print">
        <h1 className="page-title">💊 Prescrição</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copiar()} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            {copiado ? '✅ Copiado!' : 'Copiar prescrição'}
          </button>
          <button type="button" onClick={() => window.print()} className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700">
            🖨️ Imprimir
          </button>
          <button type="button" onClick={() => window.print()} title="Na janela de impressão, escolha Salvar como PDF" className="text-sm px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950">
            PDF
          </button>
        </div>
      </div>

      <p className="no-print text-xs text-gray-500 mb-4">PDF: use o botão acima e, na impressão, selecione "Salvar como PDF" (ou Microsoft Print to PDF).</p>

      {/* Conteúdo da receita */}
      <div className="card p-8 print:shadow-none print:border-none">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">🐾 {data.clinica.nome}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Receituário veterinário</p>
        </div>

        <div className="text-sm space-y-1 mb-6">
          <p><strong>Data:</strong> {new Date(data.createdAt).toLocaleString('pt-BR')}</p>
          <p><strong>Profissional:</strong> {data.usuario.nome}</p>
          <p><strong>Paciente:</strong> {data.paciente.nome} — {data.paciente.especie}{data.paciente.raca ? ` (${data.paciente.raca})` : ''}</p>
          <p><strong>Tutor:</strong> {data.paciente.tutor.nome}{data.paciente.tutor.telefone ? ` — ${data.paciente.tutor.telefone}` : ''}</p>
          {data.queixa && <p><strong>Queixa:</strong> {data.queixa}</p>}
          {data.diagnostico && <p><strong>Diagnóstico:</strong> {data.diagnostico}</p>}
        </div>

        <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">Medicamentos</h3>
        <ul className="space-y-4 text-sm">
          {itens.map((it, i) => (
            <li key={i} className="border-l-4 border-brand-500 pl-3">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {i + 1}. {it.medicamento.nome}
                {it.variante && <span className="font-normal text-gray-600 dark:text-gray-400"> — {it.variante.concentracao}{it.variante.apresentacao ? ` (${it.variante.apresentacao})` : ''}</span>}
              </p>
              {it.dosagem && <p className="text-gray-700 dark:text-gray-300">Dosagem: {it.dosagem}</p>}
              {it.frequencia && <p className="text-gray-700 dark:text-gray-300">Frequência: {it.frequencia}</p>}
              {it.duracao && <p className="text-gray-700 dark:text-gray-300">Duração: {it.duracao}</p>}
              {it.instrucoes && <p className="text-gray-700 dark:text-gray-300">Instruções: {it.instrucoes}</p>}
            </li>
          ))}
        </ul>

        {(data.prescricoes[0]?.observacoes || data.observacoes) && (
          <div className="mt-6 text-sm text-gray-700 dark:text-gray-300">
            <strong>Observações:</strong> {data.prescricoes[0]?.observacoes || data.observacoes}
          </div>
        )}
      </div>
    </div>
  );
}