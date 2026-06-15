'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2, PawPrint } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';

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

  const campos = [
    { label: 'Nome *', key: 'nome', type: 'text', placeholder: 'Nome completo' },
    { label: 'CPF', key: 'cpf', type: 'text', placeholder: '000.000.000-00' },
    { label: 'Telefone', key: 'telefone', type: 'text', placeholder: '(00) 00000-0000' },
    { label: 'Email', key: 'email', type: 'email', placeholder: 'email@exemplo.com' },
    { label: 'Endereço', key: 'endereco', type: 'text', placeholder: 'Rua, número, bairro' },
  ];

  return (
    <div>
      <PageHeader
        title="Tutores"
        subtitle="Responsáveis pelos pacientes da clínica"
        icon={<Users size={20} />}
        actions={
          <button onClick={() => abrirModal()} className="btn btn-primary">
            <Plus size={16} /> Novo tutor
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); carregarTutores(e.target.value); }}
          className="input pl-10"
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
          </div>
        ) : tutores.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title="Nenhum tutor cadastrado"
            description="Cadastre o primeiro responsável para vincular pacientes a ele."
            action={<button onClick={() => abrirModal()} className="btn btn-primary"><Plus size={16} /> Novo tutor</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {['Nome', 'CPF', 'Telefone', 'Email', 'Animais', ''].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tutores.map((tutor) => (
                  <tr key={tutor.id}>
                    <td className="cell-strong">{tutor.nome}</td>
                    <td>{tutor.cpf || '—'}</td>
                    <td>{tutor.telefone || '—'}</td>
                    <td>{tutor.email || '—'}</td>
                    <td>
                      <span className="badge badge-brand">
                        <PawPrint size={11} /> {tutor.pacientes?.length || 0}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => abrirModal(tutor)} className="action-link inline-flex items-center gap-1"><Pencil size={13} /> Editar</button>
                        <button onClick={() => excluir(tutor.id)} className="action-link-danger inline-flex items-center gap-1"><Trash2 size={13} /> Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={tutorEditando ? 'Editar tutor' : 'Novo tutor'}
        footer={
          <>
            <button onClick={() => setModalAberto(false)} className="btn btn-ghost flex-1">Cancelar</button>
            <button onClick={salvar} disabled={salvando || !form.nome} className="btn btn-primary flex-1">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {campos.map((field) => (
            <div key={field.key}>
              <label className="label">{field.label}</label>
              <input
                type={field.type}
                value={(form as any)[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="input"
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
