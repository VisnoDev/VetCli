'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';

interface Tutor {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  pacientes?: any[];
}

export default function TutoresPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [tutorEditando, setTutorEditando] = useState<Tutor | null>(null);
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', email: '', endereco: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarTutores(); }, []);

  async function carregarTutores(s?: string) {
    setLoading(true);
    try {
      const res = await api.get('/tutores', { params: { search: s } });
      setTutores(res.data);
    } finally { setLoading(false); }
  }

  function abrirModal(tutor?: Tutor) {
    if (tutor) {
      setTutorEditando(tutor);
      setForm({ nome: tutor.nome, cpf: tutor.cpf || '', telefone: tutor.telefone || '', email: tutor.email || '', endereco: tutor.endereco || '' });
    } else {
      setTutorEditando(null);
      setForm({ nome: '', cpf: '', telefone: '', email: '', endereco: '' });
    }
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome) return;
    setSalvando(true);
    try {
      if (tutorEditando) {
        await api.put(`/tutores/${tutorEditando.id}`, form);
        toast('Tutor atualizado com sucesso.', 'success');
      } else {
        await api.post('/tutores', form);
        toast('Tutor cadastrado com sucesso.', 'success');
      }
      setModalAberto(false);
      carregarTutores(search);
    } finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm('Deseja excluir este tutor?')) return;
    await api.delete(`/tutores/${id}`);
    toast('Tutor excluído.', 'success');
    carregarTutores(search);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">👤 Tutores</h1>
        <button onClick={() => abrirModal()} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Novo Tutor
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nome, CPF ou telefone..." value={search} onChange={(e) => { setSearch(e.target.value); carregarTutores(e.target.value); }} className="w-full md:w-96 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : tutores.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum tutor cadastrado</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Nome', 'CPF', 'Telefone', 'Email', 'Animais', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tutores.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{tutor.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tutor.cpf || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tutor.telefone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tutor.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tutor.pacientes?.length || 0}</td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button onClick={() => abrirModal(tutor)} className="text-brand-600 hover:text-brand-800 font-medium">Editar</button>
                    <button onClick={() => excluir(tutor.id)} className="text-red-500 hover:text-red-700 font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{tutorEditando ? 'Editar Tutor' : 'Novo Tutor'}</h2>
            <div className="space-y-3">
              {[
                { label: 'Nome *', key: 'nome', type: 'text', placeholder: 'Nome completo' },
                { label: 'CPF', key: 'cpf', type: 'text', placeholder: '000.000.000-00' },
                { label: 'Telefone', key: 'telefone', type: 'text', placeholder: '(00) 00000-0000' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Endereço', key: 'endereco', type: 'text', placeholder: 'Rua, número, bairro' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input type={field.type} value={(form as any)[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalAberto(false)} className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-2 rounded-lg text-sm font-medium transition">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}