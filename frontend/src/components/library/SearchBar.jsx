import { Icon } from "../../lib/icons.jsx";
// FILE: frontend/src/components/library/SearchBar.jsx
// Barra de busca da biblioteca com debounce e indicador de loading.

import { useState, useEffect, useRef } from "react";

/**
 * @param {{
 *   onSearch: (query: string) => void,
 *   loading: boolean,
 *   placeholder?: string
 * }} props
 */
export function SearchBar({ onSearch, loading, placeholder = "Buscar em todos os plugins…" }) {
  const [value, setValue] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [value, onSearch]);

  return (
    <div className="relative">
      {/* Ícone esquerdo: spinner quando carregando, lupa quando idle */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading ? (
          <svg className="w-4 h-4 text-om-accent animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
        ) : (
          <Icon name="search" size={16} style={{ filter: "brightness(0) invert(1) opacity(0.5)" }} />
        )}
      </div>

      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-om-surface border border-om-border rounded-xl
                   pl-9 pr-10 py-3 text-sm text-om-text placeholder:text-om-muted
                   outline-none focus:border-om-accent/60 transition-colors"
      />

      {/* Botão limpar */}
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-om-muted hover:text-om-text transition-colors"
          aria-label="Limpar busca"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
