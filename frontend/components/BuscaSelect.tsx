'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface BuscaSelectProps<T extends { id: string }> {
  placeholder?: string;
  value: T | null;
  onChange: (item: T | null) => void;
  buscar: (query: string) => Promise<T[]>;
  renderLabel: (item: T) => string;
  renderSublabel?: (item: T) => string;
}

export default function BuscaSelect<T extends { id: string }>({
  placeholder = 'Buscar...',
  value,
  onChange,
  buscar,
  renderLabel,
  renderSublabel,
}: BuscaSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [opcoes, setOpcoes] = useState<T[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  function handleInput(v: string) {
    setQuery(v);
    setAberto(true);
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setOpcoes([]); return; }
    timer.current = setTimeout(async () => {
      setCarregando(true);
      try {
        const result = await buscar(v);
        setOpcoes(result);
      } finally {
        setCarregando(false);
      }
    }, 300);
  }

  function selecionar(item: T) {
    onChange(item);
    setQuery('');
    setOpcoes([]);
    setAberto(false);
  }

  function limpar() {
    onChange(null);
    setQuery('');
    setOpcoes([]);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 surface rounded-xl px-3.5 py-2.5">
        <span className="flex-1 text-sm text-ink">{renderLabel(value)}</span>
        <button type="button" onClick={limpar} className="text-ink-faint hover:text-ink transition flex-shrink-0">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center surface rounded-xl px-3.5 py-2.5 focus-within:border-brand-400 focus-within:ring-[3px] focus-within:ring-[var(--ring)] transition">
        <Search size={15} className="text-ink-faint mr-2 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (query.trim()) setAberto(true); }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent text-ink focus:outline-none placeholder:text-ink-faint"
        />
        {carregando && <span className="text-xs text-ink-faint ml-2 flex-shrink-0">buscando...</span>}
      </div>

      {aberto && opcoes.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 surface rounded-xl shadow-[var(--shadow-lift)] z-50 max-h-52 overflow-y-auto p-1">
          {opcoes.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionar(item)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/50 transition"
            >
              <p className="text-sm font-medium text-ink">{renderLabel(item)}</p>
              {renderSublabel && (
                <p className="text-xs text-ink-soft mt-0.5">{renderSublabel(item)}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {aberto && query.length >= 2 && !carregando && opcoes.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 surface rounded-xl shadow-[var(--shadow-lift)] z-50 px-3 py-4">
          <p className="text-sm text-ink-faint text-center">Nenhum resultado encontrado</p>
        </div>
      )}
    </div>
  );
}
