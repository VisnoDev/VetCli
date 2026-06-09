'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, PawPrint, ArrowLeft, ArrowRight, Building2, UserRound, Check } from 'lucide-react';
import api from '../../lib/api';

type Step = 'clinica' | 'admin';

export default function CadastroPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState<Step>('clinica');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [clinica, setClinica] = useState({ clinicaNome: '', cnpj: '', telefone: '', clinicaEmail: '' });
  const [admin, setAdmin] = useState({ adminNome: '', adminEmail: '', adminSenha: '', confirmarSenha: '' });

  function avancar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (!clinica.clinicaNome.trim()) { setErro('Nome da clínica é obrigatório.'); return; }
    setStep('admin');
  }

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (admin.adminSenha.length < 8) { setErro('Senha deve ter pelo menos 8 caracteres.'); return; }
    if (admin.adminSenha !== admin.confirmarSenha) { setErro('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/registrar', {
        clinicaNome: clinica.clinicaNome,
        cnpj: clinica.cnpj || undefined,
        telefone: clinica.telefone || undefined,
        clinicaEmail: clinica.clinicaEmail || undefined,
        adminNome: admin.adminNome,
        adminEmail: admin.adminEmail,
        adminSenha: admin.adminSenha,
      });
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar conta. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full surface rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition';
  const labelClass = 'block text-sm font-medium text-ink mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center p-5 sm:p-8 relative">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-xl animate-fade-up">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/25 mb-4">
            <PawPrint size={26} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Crie a conta da sua clínica</h1>
          <p className="text-ink-soft text-sm mt-1">Leva menos de um minuto. Sem cartão de crédito.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[
            { id: 'clinica', icon: Building2, label: 'Clínica' },
            { id: 'admin', icon: UserRound, label: 'Sua conta' },
          ].map((s, i) => {
            const done = step === 'admin' && s.id === 'clinica';
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : done ? 'bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400'
                    : 'surface text-ink-soft'
                  }`}>
                    {done ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`text-sm font-medium ${active || done ? 'text-ink' : 'text-ink-soft'}`}>{s.label}</span>
                </div>
                {i === 0 && <div className={`h-px w-8 ${done ? 'bg-brand-400' : 'bg-[var(--hairline)]'}`} />}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="surface rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-soft)]">
          {step === 'clinica' && (
            <form onSubmit={avancar} className="space-y-4">
              <div>
                <label className={labelClass}>Nome da clínica <span className="text-accent-500">*</span></label>
                <input type="text" value={clinica.clinicaNome} onChange={(e) => setClinica({ ...clinica, clinicaNome: e.target.value })} className={inputClass} placeholder="Ex: Clínica Veterinária PetCare" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input type="text" value={clinica.cnpj} onChange={(e) => setClinica({ ...clinica, cnpj: e.target.value })} className={inputClass} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input type="text" value={clinica.telefone} onChange={(e) => setClinica({ ...clinica, telefone: e.target.value })} className={inputClass} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div>
                <label className={labelClass}>E-mail da clínica</label>
                <input type="email" value={clinica.clinicaEmail} onChange={(e) => setClinica({ ...clinica, clinicaEmail: e.target.value })} className={inputClass} placeholder="contato@suaclinica.com" />
              </div>

              {erro && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">{erro}</div>}

              <button type="submit" className="group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-600/20 transition-all">
                Próximo <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
          )}

          {step === 'admin' && (
            <form onSubmit={finalizar} className="space-y-4">
              <div>
                <label className={labelClass}>Seu nome <span className="text-accent-500">*</span></label>
                <input type="text" value={admin.adminNome} onChange={(e) => setAdmin({ ...admin, adminNome: e.target.value })} className={inputClass} placeholder="Nome completo" required />
              </div>
              <div>
                <label className={labelClass}>E-mail de acesso <span className="text-accent-500">*</span></label>
                <input type="email" value={admin.adminEmail} onChange={(e) => setAdmin({ ...admin, adminEmail: e.target.value })} className={inputClass} placeholder="voce@email.com" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Senha <span className="text-accent-500">*</span></label>
                  <input type="password" value={admin.adminSenha} onChange={(e) => setAdmin({ ...admin, adminSenha: e.target.value })} className={inputClass} placeholder="Mín. 8 caracteres" required />
                </div>
                <div>
                  <label className={labelClass}>Confirmar <span className="text-accent-500">*</span></label>
                  <input type="password" value={admin.confirmarSenha} onChange={(e) => setAdmin({ ...admin, confirmarSenha: e.target.value })} className={inputClass} placeholder="Repita a senha" required />
                </div>
              </div>

              {erro && <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">{erro}</div>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep('clinica'); setErro(''); }} className="flex items-center gap-1.5 px-4 py-3 rounded-xl surface text-ink-soft hover:text-ink transition text-sm font-medium">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-600/20 transition-all">
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-ink-soft mt-6">
          Já tem conta?{' '}
          <a href="/login" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">Fazer login</a>
        </p>
      </div>
    </div>
  );
}
