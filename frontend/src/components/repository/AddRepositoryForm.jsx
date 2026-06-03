// FILE: frontend/src/components/repository/AddRepositoryForm.jsx
// Formulário para adicionar um novo repositório pela URL.
// Mostra feedback de validação e status do fetch.

import { useState } from "react";
import { useOmniStore } from "../../lib/store";
import { Icon } from "../../lib/icons.jsx";

export function AddRepositoryForm() {
  const addRepository = useOmniStore((s) => s.addRepository);
  const [url, setUrl]         = useState("");
  const [status, setStatus]   = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Validação básica de URL antes de fazer fetch
    try {
      // Aceita caminhos relativos (/algo) além de URLs absolutas
      if (!trimmed.startsWith("/")) new URL(trimmed);
    } catch {
      setStatus("error");
      setMessage("URL inválida. Use https://... ou um caminho relativo.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const result = await addRepository(trimmed);

    if (result.success) {
      setStatus("success");
      setMessage("Repositório adicionado com sucesso!");
      setUrl("");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("error");
      setMessage(result.error ?? "Não foi possível carregar o repositório.");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="bg-om-card border border-om-border rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-display font-semibold text-sm text-om-text mb-0.5">
          Adicionar repositório
        </h3>
        <p className="text-xs text-om-muted">
          Cole a URL do <code className="font-mono text-om-accent">index.json</code> de qualquer repositório público.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setStatus("idle"); }}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSubmit()}
            placeholder="https://raw.githubusercontent.com/user/repo/main/index.json"
            className="w-full bg-om-surface border border-om-border rounded-xl pl-4 pr-4 py-2.5
                       text-sm text-om-text placeholder:text-om-muted/50 font-mono
                       outline-none focus:border-om-accent/60 transition-colors"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !url.trim()}
          className="tv-focusable flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                     bg-om-accent hover:bg-om-accent-dim text-white text-sm font-semibold
                     transition-all duration-150 active:scale-95 disabled:opacity-50
                     disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Icon name="install" size={14} style={{ filter: "brightness(0) invert(1)" }} />
          )}
          {isLoading ? "Carregando…" : "Adicionar"}
        </button>
      </div>

      {/* Feedback */}
      {status !== "idle" && message && (
        <div className={`flex items-center gap-2 text-xs ${
          status === "success" ? "text-om-safe" :
          status === "error"   ? "text-om-danger" :
          "text-om-accent"
        }`}>
          {status === "success" && <Icon name="badge" size={12} style={{ filter: "brightness(0) saturate(100%) invert(55%) sepia(60%) saturate(400%) hue-rotate(90deg)" }} />}
          {status === "error"   && <Icon name="warning" size={12} style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(90%) saturate(600%) hue-rotate(330deg)" }} />}
          <span>{message}</span>
        </div>
      )}

      {/* Dica */}
      <p className="text-[11px] text-om-muted/60 font-mono">
        Exemplo oficial:{" "}
        <button
          onClick={() => setUrl("/community-repo/index.json")}
          className="text-om-accent/70 hover:text-om-accent underline-offset-2 hover:underline"
        >
          /community-repo/index.json
        </button>
      </p>
    </div>
  );
}
