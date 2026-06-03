// FILE: frontend/src/components/search/SearchSuggestions.jsx
// Dropdown de autocomplete com debounce.
// Busca em todos os plugins carregados e mostra sugestões de títulos.

import { useState, useEffect, useRef, useCallback } from "react";
import { getAllPlugins } from "../../lib/pluginRegistry";
import { Icon } from "../../lib/icons.jsx";

const DEBOUNCE_MS   = 250;
const MAX_RESULTS   = 8;

const MEDIA_EMOJI = {
  "image-series": "🖼",
  ebook:          "📖",
  "video-stream": "📺",
};

/**
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   onSelect: (item: any) => void,
 *   onSearch: (q: string) => void,
 *   placeholder?: string,
 *   loading?: boolean,
 * }} props
 */
export function SearchSuggestions({ value, onChange, onSelect, onSearch, placeholder, loading }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Busca assíncrona nas sugestões
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }

    const plugins = getAllPlugins();
    if (plugins.length === 0) return;

    const results = [];
    await Promise.allSettled(
      plugins.slice(0, 3).map(async (plugin) => {
        try {
          const items = await plugin.search(q);
          items.slice(0, 4).forEach((item) => {
            if (!results.find((r) => r.id === item.id && r.pluginSlug === item.pluginSlug)) {
              results.push({ ...item, pluginSlug: item.pluginSlug ?? plugin.slug });
            }
          });
        } catch { /* silencia erros individuais */ }
      })
    );

    setSuggestions(results.slice(0, MAX_RESULTS));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setSelectedIdx(-1);

    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(value), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [value, fetchSuggestions]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (!inputRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Enter") { onSearch(value); setShowDropdown(false); }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIdx >= 0) {
          onSelect(suggestions[selectedIdx]);
          setShowDropdown(false);
        } else {
          onSearch(value);
          setShowDropdown(false);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  }

  const shouldShow = showDropdown && focused && suggestions.length > 0 && value.length >= 2;

  return (
    <div className="relative">
      {/* Input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg className="w-5 h-5 text-om-accent animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <Icon name="search" size={18} style={{ filter: "brightness(0) invert(0.5)" }} />
          )}
        </span>

        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => { setFocused(true); setShowDropdown(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Buscar títulos, autores, gêneros…"}
          className="w-full bg-om-surface border border-om-border rounded-2xl
                     pl-12 pr-12 py-3.5 text-base text-om-text placeholder:text-om-muted/50
                     outline-none focus:border-om-accent/60 transition-colors shadow-sm"
          autoComplete="off"
        />

        {value && (
          <button
            onClick={() => { onChange(""); setSuggestions([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-om-muted hover:text-om-text transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown de sugestões */}
      {shouldShow && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-om-card border border-om-border
                     rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-scale-in"
        >
          {suggestions.map((item, i) => (
            <button
              key={`${item.pluginSlug}-${item.id}`}
              onClick={() => { onSelect(item); setShowDropdown(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === selectedIdx ? "bg-om-accent/10" : "hover:bg-om-surface"
              } ${i < suggestions.length - 1 ? "border-b border-om-border/50" : ""}`}
            >
              {/* Capa */}
              <div className="shrink-0 w-8 h-10 rounded-lg overflow-hidden bg-om-surface border border-om-border">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">
                    {MEDIA_EMOJI[item.mediaType] ?? "📄"}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-om-text font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-om-muted">{MEDIA_EMOJI[item.mediaType]} {item.mediaType}</span>
                  {item.tags?.[0] && <span className="text-[10px] text-om-muted/60">• {item.tags[0]}</span>}
                  <span className="text-[10px] text-om-accent/70 ml-auto">{item.pluginSlug}</span>
                </div>
              </div>

              {/* Seta */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-om-muted/40 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}

          {/* Opção de busca completa */}
          <button
            onClick={() => { onSearch(value); setShowDropdown(false); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-om-accent hover:bg-om-accent/5 transition-colors border-t border-om-border"
          >
            <Icon name="search" size={14} style={{ filter: "brightness(0) saturate(100%) invert(58%) sepia(75%) saturate(570%) hue-rotate(346deg)" }} />
            Buscar por "<strong>{value}</strong>" em todos os plugins
          </button>
        </div>
      )}
    </div>
  );
}
