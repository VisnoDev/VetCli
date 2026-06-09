'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, PawPrint, Mail, Lock, ArrowRight, ShieldCheck, HeartPulse, Stethoscope } from 'lucide-react';
import api from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      router.push('/dashboard');
    } catch {
      setErro('Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Painel de marca */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b201d] via-[#0a1a18] to-[#05100e] p-12 text-white">
        {/* brilhos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-accent-500/10 blur-3xl" />
        {/* grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/40">
            <PawPrint size={24} className="text-white" />
          </div>
          <span className="font-display text-2xl font-extrabold tracking-tight">VetCli</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            O cuidado com cada<br />paciente começa<br />
            <span className="text-brand-300">com boa gestão.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-md">
            Prontuários, agenda, laboratório e financeiro da sua clínica veterinária num só lugar.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            {[
              { icon: HeartPulse, txt: 'Prontuário completo de cada pet' },
              { icon: Stethoscope, txt: 'Agenda e atendimentos integrados' },
              { icon: ShieldCheck, txt: 'Seus dados protegidos e isolados' },
            ].map(({ icon: Icon, txt }) => (
              <div key={txt} className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon size={16} className="text-brand-300" />
                </div>
                <span className="text-sm">{txt}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/30">VetCli © 2026 — Todos os direitos reservados</p>
      </div>

      {/* Formulário */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 min-h-screen lg:min-h-0">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        <div className="w-full max-w-sm animate-fade-up">
          {/* logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <PawPrint size={22} className="text-white" />
            </div>
            <span className="font-display text-xl font-extrabold text-ink">VetCli</span>
          </div>

          <h2 className="font-display text-2xl font-extrabold text-ink">Bem-vindo de volta 👋</h2>
          <p className="text-ink-soft text-sm mt-1 mb-8">Acesse o painel da sua clínica.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full surface rounded-xl pl-11 pr-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full surface rounded-xl pl-11 pr-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm animate-fade-in">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-600/20 transition-all"
            >
              {loading ? 'Entrando...' : (
                <>Entrar <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-ink-soft mt-7">
            Ainda não tem conta?{' '}
            <a href="/cadastro" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">
              Cadastrar clínica
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
