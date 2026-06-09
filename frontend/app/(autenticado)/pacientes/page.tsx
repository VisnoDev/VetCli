'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import Paginacao from '../../../components/Paginacao';
import { can, getStoredRole } from '../../../lib/permissions';

interface Tutor {
  id: string;
  nome: string;
}

interface Paciente {
  id: string;
  nome: string;
  especie: string;
  raca?: string;
  sexo?: string;
  peso?: number;
  dataNasc?: string;
  alergias?: string;
  tutor: Tutor;
}

export default function PacientesPage() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null);
  const [form, setForm] = useState({ nome: '', especie: '', raca: '', sexo: '', peso: '', dataNasc: '', alergias: '', tutorId: '' });
  const [salvando, setSalvando] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => { carregarDados(search, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const podeVerTutores = can(getStoredRole(), 'tutores:read');
  const podeEscrever = can(getStoredRole(), 'pacientes:write');

  async function carregarDados(s = search, p = page) {
    setLoading(true);
    try {
      const pacRes = await api.get('/pacientes', { params: { search: s || undefined, page: p, limit } });
      setPacientes(pacRes.data.data);
      setTotal(pacRes.data.total);
      setTotalPages(pacRes.data.totalPages);
      // Tutores só são necessários para o formulário de cadastro/edição.
      if (podeVerTutores) {
        const tutRes = await api.get('/tutores');
        setTutores(tutRes.data);
      }
    } finally { setLoading(false); }
  }

  async function buscar(s: string) {
    setSearch(s);
    setPage(1);
    carregarDados(s, 1);
  }

  function abrirModal(paciente?: Paciente) {
    if (paciente) {
      setPacienteEditando(paciente);
      setForm({ nome: paciente.nome, especie: paciente.especie, raca: paciente.raca || '', sexo: paciente.sexo || '', peso: paciente.peso?.toString() || '', dataNasc: paciente.dataNasc ? paciente.dataNasc.split('T')[0] : '', alergias: paciente.alergias || '', tutorId: paciente.tutor.id });
    } else {
      setPacienteEditando(null);
      setForm({ nome: '', especie: '', raca: '', sexo: '', peso: '', dataNasc: '', alergias: '', tutorId: '' });
    }
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome || !form.especie || !form.tutorId) return;
    setSalvando(true);
    try {
      const payload = { ...form, peso: form.peso ? parseFloat(form.peso) : undefined };
      if (pacienteEditando) {
        await api.put(`/pacientes/${pacienteEditando.id}`, payload);
        toast('Paciente atualizado com sucesso.', 'success');
      } else {
        await api.post('/pacientes', payload);
        toast('Paciente cadastrado com sucesso.', 'success');
      }
      setModalAberto(false);
      carregarDados(search, pacienteEditando ? page : 1);
      if (!pacienteEditando) setPage(1);
    } finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm('Deseja excluir este paciente?')) return;
    await api.delete(`/pacientes/${id}`);
    toast('Paciente excluído.', 'success');
    carregarDados();
  }

  const especieEmoji: Record<string, string> = {
    Cão: '🐶', Gato: '🐱', Ave: '🐦', Coelho: '🐰', Hamster: '🐹', Réptil: '🦎', Outro: '🐾',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🐶 Pacientes</h1>
        {podeEscrever && (
          <button onClick={() => abrirModal()} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + Novo Paciente
          </button>
        )}
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nome, espécie ou raça..." value={search} onChange={(e) => buscar(e.target.value)} className="w-full md:w-96 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : pacientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum paciente cadastrado</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Animal', 'Espécie', 'Raça', 'Sexo', 'Peso', 'Tutor', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pacientes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {especieEmoji[p.especie] || '🐾'} {p.nome}
                    {p.alergias && <span className="ml-2 text-xs bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-medium">⚠️ Alergia</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.especie}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.raca || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.sexo || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.peso ? `${p.peso}kg` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.tutor.nome}</td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button onClick={() => router.push(`/pacientes/${p.id}`)} className="text-brand-600 hover:text-brand-800 font-medium">Ver</button>
                    {podeEscrever && <button onClick={() => abrirModal(p)} className="text-brand-600 hover:text-brand-800 font-medium">Editar</button>}
                    {podeEscrever && <button onClick={() => excluir(p.id)} className="text-red-500 hover:text-red-700 font-medium">Excluir</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginacao page={page} totalPages={totalPages} total={total} limit={limit} onChange={(p) => setPage(p)} />
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{pacienteEditando ? 'Editar Paciente' : 'Novo Paciente'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do animal" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Espécie *</label>
                <select value={form.especie} onChange={(e) => setForm({ ...form, especie: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Selecione...</option>
                  {['Cão', 'Gato', 'Ave', 'Coelho', 'Hamster', 'Réptil', 'Outro'].map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raça</label>
                <input type="text" value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} placeholder="Raça do animal" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexo</label>
                <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Selecione...</option>
                  <option value="Macho">Macho</option>
                  <option value="Fêmea">Fêmea</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (kg)</label>
                <input type="number" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} placeholder="Ex: 5.5" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Nascimento</label>
                <input type="date" value={form.dataNasc} onChange={(e) => setForm({ ...form, dataNasc: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tutor *</label>
                <select value={form.tutorId} onChange={(e) => setForm({ ...form, tutorId: e.target.value })} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Selecione o tutor...</option>
                  {tutores.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">⚠️ Alergias / Intolerâncias</label>
                <textarea
                  value={form.alergias}
                  onChange={(e) => setForm({ ...form, alergias: e.target.value })}
                  placeholder="Ex: Amoxicilina, dipirona, látex..."
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalAberto(false)} className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome || !form.especie || !form.tutorId} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-2 rounded-lg text-sm font-medium transition">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}