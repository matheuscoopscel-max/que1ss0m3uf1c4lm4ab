// FILE: frontend/src/components/extensions/PluginStatusBadge.jsx
// Exibe o status de carga (em memória) de um plugin instalado.

import { isPluginLoaded } from "../../lib/pluginRegistry";
import { useOmniStore } from "../../lib/store";

/**
 * @param {{ slug: string }} props
 */
export function PluginStatusBadge({ slug }) {
  const loadStatus = useOmniStore((s) => s.pluginLoadStatus?.[slug]);
  const loaded = isPluginLoaded(slug);

  if (loaded) {
    return (
      <span className="badge bg-om-safe/15 text-om-safe border border-om-safe/20">
        ● ativo
      </span>
    );
  }

  if (loadStatus === "loading") {
    return (
      <span className="badge bg-om-accent/15 text-om-accent border border-om-accent/20">
        ◌ carregando
      </span>
    );
  }

  if (loadStatus === "error") {
    return (
      <span className="badge bg-om-danger/15 text-om-danger border border-om-danger/20">
        ✕ erro
      </span>
    );
  }

  // Instalado mas ainda não carregado nesta sessão
  return (
    <span className="badge bg-om-surface text-om-muted border border-om-border">
      ○ inativo
    </span>
  );
}
