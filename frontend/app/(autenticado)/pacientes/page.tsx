'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Plus, Search, Eye, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';
import Paginacao from '../../../components/Paginacao';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
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

const especieEmoji: Record<string, string> = {
  Cão: '🐶', Gato: '🐱', Ave: '🐦', Coelho: '🐰', Hamster: '🐹', Réptil: '🦎', Outro: '🐾',
};

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
      if (podeVerTutores) {
        const tutRes = await api.get('/tutores');
        setTutores(tutRes.data);
      }
    } finally { setLoading(false); }
  }

  function buscar(s: string) {
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

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Animais atendidos pela clínica"
        icon={<Heart size={20} />}
        actions={podeEscrever && (
          <button onClick={() => abrirModal()} className="btn btn-primary"><Plus size={16} /> Novo paciente</button>
        )}
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        <input type="search" placeholder="Buscar por nome, espécie ou raça..." value={search} onChange={(e) => buscar(e.target.value)} className="input pl-10" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
        ) : pacientes.length === 0 ? (
          <EmptyState
            icon={<Heart size={24} />}
            title="Nenhum paciente cadastrado"
            description="Cadastre o primeiro animal para começar o histórico clínico."
            action={podeEscrever ? <button onClick={() => abrirModal()} className="btn btn-primary"><Plus size={16} /> Novo paciente</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>{['Animal', 'Espécie', 'Raça', 'Sexo', 'Peso', 'Tutor', ''].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/60 text-base">{especieEmoji[p.especie] || '🐾'}</span>
                        <span>{p.nome}</span>
                        {p.alergias && <span className="badge badge-red"><TriangleAlert size={11} /> Alergia</span>}
                      </div>
                    </td>
                    <td>{p.especie}</td>
                    <td>{p.raca || '—'}</td>
                    <td>{p.sexo || '—'}</td>
                    <td>{p.peso ? `${p.peso} kg` : '—'}</td>
                    <td>{p.tutor.nome}</td>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => router.push(`/pacientes/${p.id}`)} className="action-link inline-flex items-center gap-1"><Eye size={13} /> Ver</button>
                        {podeEscrever && <button onClick={() => abrirModal(p)} className="action-link inline-flex items-center gap-1"><Pencil size={13} /> Editar</button>}
                        {podeEscrever && <button onClick={() => excluir(p.id)} className="action-link-danger inline-flex items-center gap-1"><Trash2 size={13} /> Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao page={page} totalPages={totalPages} total={total} limit={limit} onChange={(p) => setPage(p)} />
      </div>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={pacienteEditando ? 'Editar paciente' : 'Novo paciente'}
        footer={
          <>
            <button onClick={() => setModalAberto(false)} className="btn btn-ghost flex-1">Cancelar</button>
            <button onClick={salvar} disabled={salvando || !form.nome || !form.especie || !form.tutorId} className="btn btn-primary flex-1">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label">Nome *</label>
            <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do animal" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Espécie *</label>
              <select value={form.especie} onChange={(e) => setForm({ ...form, especie: e.target.value })} className="input">
                <option value="">Selecione...</option>
                {['Cão', 'Gato', 'Ave', 'Coelho', 'Hamster', 'Réptil', 'Outro'].map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sexo</label>
              <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} className="input">
                <option value="">Selecione...</option>
                <option value="Macho">Macho</option>
                <option value="Fêmea">Fêmea</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Raça</label>
              <input type="text" value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} placeholder="Raça" className="input" />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input type="number" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} placeholder="Ex: 5.5" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Data de nascimento</label>
            <input type="date" value={form.dataNasc} onChange={(e) => setForm({ ...form, dataNasc: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Tutor *</label>
            <select value={form.tutorId} onChange={(e) => setForm({ ...form, tutorId: e.target.value })} className="input">
              <option value="">Selecione o tutor...</option>
              {tutores.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1"><TriangleAlert size={13} className="text-accent-500" /> Alergias / Intolerâncias</label>
            <textarea value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} placeholder="Ex: Amoxicilina, dipirona, látex..." rows={2} className="input resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
