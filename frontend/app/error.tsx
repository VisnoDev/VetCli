'use client';

import { useEffect } from 'react';
import { PawPrint, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, isto pode ser enviado a um serviço de monitoramento.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-600/25 mb-5">
          <PawPrint size={28} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Algo deu errado</h1>
        <p className="text-ink-soft text-sm mt-2">
          Encontramos um problema ao carregar esta página. Você pode tentar de novo.
        </p>

        {error.digest && (
          <p className="text-xs text-ink-soft mt-3 font-mono">Código: {error.digest}</p>
        )}

        <div className="flex items-center justify-center gap-3 mt-7">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition-all"
          >
            <RotateCcw size={16} /> Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl surface text-ink-soft hover:text-ink transition text-sm font-medium"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
