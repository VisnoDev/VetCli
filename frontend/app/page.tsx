'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PawPrint } from 'lucide-react';
import api from '../lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    api.get('/auth/me')
      .then(() => router.replace('/dashboard'))
      .catch(() => {
        localStorage.removeItem('usuario');
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/25 animate-pulse">
          <PawPrint size={26} className="text-white" />
        </div>
        <p className="text-ink-soft text-sm">Carregando...</p>
      </div>
    </div>
  );
}
