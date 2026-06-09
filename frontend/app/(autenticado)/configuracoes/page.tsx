'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../components/Toast';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VETERINARIO' | 'RECEPCIONISTA' | 'BIOQUIMICO';
interface Clinica { id: string; nome: string; cnpj: string | null; telefone: string | null; email: string | null; endereco: string | null; ativo: boolean; }
interface UsuarioRow { id: string; nome: string; email: string; role: Role; ativo: boolean; }
interface StoredUser { id: string; nome: string; email: string; role: Role; clinicaId: string; }

function roleLabel(r: Role) {
  const m: Record<Role, string> = { SUPER_ADMIN: 'Super admin', ADMIN: 'Administrador', VETERINARIO: 'Veterinário', RECEPCIONISTA: 'Recepcionista', BIOQUIMICO: 'Bioquímico' };
  return m[r] ?? r;
}

function roleOptionsFor(actor: Role) {
  const opts: { value: Role; label: string }[] = [
    { value: 'ADMIN', label: 'Administrador' }, { value: 'VETERINARIO', label: 'Veterinário' },
    { value: 'RECEPCIONISTA', label: 'Recepcionista' }, { value: 'BIOQUIMICO', label: 'Bioquímico' },
  ];
  if (actor === 'SUPER_ADMIN') opts.unshift({ value: 'SUPER_ADMIN', label: 'Super administrador' });
  return opts;
}

export default function ConfiguracoesPage() {
  const [me, setMe] = useState<StoredUser | null>(null);
  const [aba, setAba] = useState<'clinica' | 'usuarios' | 'conta'>('clinica');
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [clinicaSel, setClinicaSel] = useState<string>('');
  const [formClinica, setFormClinica] = useState({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
  const [salvandoClinica, setSalvandoClinica] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [novo, setNovo] = useState({ nome: '', email: '', senha: '', role: 'RECEPCIONISTA' as Role });
  const [modalNovaClinica, setModalNovaClinica] = useState(false);
  const [novaClinica, setNovaClinica] = useState({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
  const [senhaUserId, setSenhaUserId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [minhaSenha, setMinhaSenha] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const podeAdmin = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN';

  const carregarClinicas = useCallback(async () => {
    const res = await api.get<Clinica[]>('/clinicas');
    setClinicas(res.data);
    return res.data;
  }, []);

  const carregarFormClinica = useCallback(async (id: string) => {
    if (!id) return;
    const res = await api.get<Clinica>(`/clinicas/${id}`);
    const c = res.data;
    setFormClinica({ nome: c.nome, cnpj: c.cnpj ?? '', telefone: c.telefone ?? '', email: c.email ?? '', endereco: c.endereco ?? '' });
  }, []);

  const carregarUsuarios = useCallback(async () => {
    if (!clinicaSel || !podeAdmin) return;
    const params: Record<string, string> = { incluirInativos: 'true' };
    if (me?.role === 'SUPER_ADMIN') params.clinicaId = clinicaSel;
    const res = await api.get<UsuarioRow[]>('/usuarios', { params });
    setUsuarios(res.data);
  }, [clinicaSel, podeAdmin, me?.role]);

  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    if (!raw) return;
    setMe(JSON.parse(raw) as StoredUser);
  }, []);

  useEffect(() => {
    if (!me) return;
    void carregarClinicas().then((list) => {
      if (!list?.length) return;
      setClinicaSel((prev) => {
        if (me.role !== 'SUPER_ADMIN') return me.clinicaId;
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0].id;
      });
    }).catch(() => toast('Não foi possível carregar clínicas.', 'error'));
  }, [me, carregarClinicas]);

  useEffect(() => { if (!clinicaSel) return; void carregarFormClinica(clinicaSel); }, [clinicaSel, carregarFormClinica]);
  useEffect(() => { if (!me || !podeAdmin || !clinicaSel) return; void carregarUsuarios().catch(() => {}); }, [me, podeAdmin, clinicaSel, carregarUsuarios]);

  async function salvarClinica() {
    if (!clinicaSel || !podeAdmin) return;
    setSalvandoClinica(true);
    try {
      await api.patch(`/clinicas/${clinicaSel}`, { nome: formClinica.nome, cnpj: formClinica.cnpj || null, telefone: formClinica.telefone || null, email: formClinica.email || null, endereco: formClinica.endereco || null });
      toast('Dados da clínica salvos.', 'success');
      await carregarClinicas();
    } finally { setSalvandoClinica(false); }
  }

  async function criarClinica() {
    if (!novaClinica.nome.trim()) return;
    await api.post('/clinicas', { nome: novaClinica.nome.trim(), cnpj: novaClinica.cnpj || undefined, telefone: novaClinica.telefone || undefined, email: novaClinica.email || undefined, endereco: novaClinica.endereco || undefined });
    setModalNovaClinica(false);
    setNovaClinica({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
    toast('Clínica criada.', 'success');
    await carregarClinicas();
  }

  async function criarUsuario() {
    if (!me || !clinicaSel) return;
    await api.post('/usuarios', { nome: novo.nome.trim(), email: novo.email.trim(), senha: novo.senha, role: novo.role, ...(me.role === 'SUPER_ADMIN' ? { clinicaId: clinicaSel } : {}) });
    setNovo({ nome: '', email: '', senha: '', role: 'RECEPCIONISTA' });
    toast('Usuário criado com sucesso.', 'success');
    await carregarUsuarios();
  }

  async function toggleAtivo(u: UsuarioRow) {
    await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo });
    await carregarUsuarios();
  }

  async function salvarSenha() {
    if (!senhaUserId || novaSenha.length < 6) return;
    await api.patch(`/usuarios/${senhaUserId}/senha`, { senha: novaSenha });
    setSenhaUserId(null);
    setNovaSenha('');
    toast('Senha atualizada.', 'success');
  }

  async function trocarMinhaSenha(e: React.FormEvent) {
    e.preventDefault();
    if (minhaSenha.novaSenha !== minhaSenha.confirmar) {
      toast('As novas senhas não coincidem.', 'error');
      return;
    }
    setSalvandoSenha(true);
    try {
      await api.post('/auth/minha-senha', {
        senhaAtual: minhaSenha.senhaAtual,
        novaSenha: minhaSenha.novaSenha,
      });
      setMinhaSenha({ senhaAtual: '', novaSenha: '', confirmar: '' });
      toast('Senha alterada com sucesso.', 'success');
    } finally {
      setSalvandoSenha(false);
    }
  }

  if (!me) return <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">⚙️ Configurações</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Dados da clínica e usuários. Alterações sensíveis exigem perfil de administrador.</p>

<div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-1">
        {(['clinica', 'usuarios', 'conta'] as const).map((a) => (
          (a === 'usuarios' && !podeAdmin) ? null :
          <button key={a} type="button" onClick={() => setAba(a)} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${aba === a ? 'bg-white dark:bg-gray-900 text-brand-600 border border-b-0 border-gray-200 dark:border-gray-800' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
            {a === 'clinica' ? 'Clínica' : a === 'usuarios' ? 'Usuários' : 'Minha conta'}
          </button>
        ))}
      </div>

      {aba === 'clinica' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          {me.role === 'SUPER_ADMIN' && clinicas.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Clínica ativa</label>
                <select value={clinicaSel} onChange={(e) => setClinicaSel(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => setModalNovaClinica(true)} className="text-sm px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">+ Nova clínica</button>
            </div>
          )}

          {podeAdmin ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                  <input value={formClinica.nome} onChange={(e) => setFormClinica({ ...formClinica, nome: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ</label>
                  <input value={formClinica.cnpj} onChange={(e) => setFormClinica({ ...formClinica, cnpj: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                  <input value={formClinica.telefone} onChange={(e) => setFormClinica({ ...formClinica, telefone: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
                  <input type="email" value={formClinica.email} onChange={(e) => setFormClinica({ ...formClinica, email: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Endereço</label>
                  <input value={formClinica.endereco} onChange={(e) => setFormClinica({ ...formClinica, endereco: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>
              <button type="button" onClick={() => void salvarClinica()} disabled={salvandoClinica || !clinicaSel} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">{salvandoClinica ? 'Salvando...' : 'Salvar clínica'}</button>
            </>
          ) : (
            <p className="text-sm text-gray-500">Apenas administradores podem editar estes dados.</p>
          )}
        </div>
      )}

      {aba === 'usuarios' && podeAdmin && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Novo usuário</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Nome completo" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <input placeholder="E-mail (login)" type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <input placeholder="Senha inicial (mín. 6)" type="password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <select value={novo.role} onChange={(e) => setNovo({ ...novo, role: e.target.value as Role })} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {roleOptionsFor(me.role).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => void criarUsuario()} disabled={!novo.nome || !novo.email || novo.senha.length < 6} className="mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">Criar usuário</button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>{['Nome', 'E-mail', 'Papel', 'Status', 'Ações'].map((h) => <th key={h} className="text-left px-4 py-2 text-gray-600 dark:text-gray-400">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{u.nome}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{roleLabel(u.role)}</td>
                    <td className="px-4 py-2">{u.ativo ? <span className="text-green-600 text-xs">Ativo</span> : <span className="text-red-600 text-xs">Inativo</span>}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button type="button" onClick={() => void toggleAtivo(u)} className="text-xs text-brand-600 hover:underline">{u.ativo ? 'Desativar' : 'Ativar'}</button>
                      <button type="button" onClick={() => setSenhaUserId(u.id)} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">Nova senha</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNovaClinica && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Nova clínica</h3>
            <input placeholder="Nome da clínica *" value={novaClinica.nome} onChange={(e) => setNovaClinica({ ...novaClinica, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input placeholder="CNPJ (opcional)" value={novaClinica.cnpj} onChange={(e) => setNovaClinica({ ...novaClinica, cnpj: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalNovaClinica(false)} className="flex-1 border py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
              <button type="button" onClick={() => void criarClinica()} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm">Criar</button>
            </div>
          </div>
        </div>
      )}

      {aba === 'conta' && me && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-md space-y-6">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Nome</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{me.nome}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">E-mail</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{me.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Cargo</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{roleLabel(me.role)}</p>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          <form onSubmit={(e) => void trocarMinhaSenha(e)} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Alterar senha</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Senha atual</label>
              <input
                type="password"
                value={minhaSenha.senhaAtual}
                onChange={(e) => setMinhaSenha({ ...minhaSenha, senhaAtual: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nova senha</label>
              <input
                type="password"
                value={minhaSenha.novaSenha}
                onChange={(e) => setMinhaSenha({ ...minhaSenha, novaSenha: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar nova senha</label>
              <input
                type="password"
                value={minhaSenha.confirmar}
                onChange={(e) => setMinhaSenha({ ...minhaSenha, confirmar: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <button
              type="submit"
              disabled={salvandoSenha || !minhaSenha.senhaAtual || minhaSenha.novaSenha.length < 8}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50"
            >
              {salvandoSenha ? 'Salvando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      )}

      {senhaUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Definir nova senha</h3>
            <input type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setSenhaUserId(null); setNovaSenha(''); }} className="flex-1 border py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancelar</button>
              <button type="button" onClick={() => void salvarSenha()} disabled={novaSenha.length < 6} className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}