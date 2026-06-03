// FILE: frontend/src/pages/SettingsPage.jsx
import { useOmniStore } from "../lib/store";
import { Icon, Logo } from "../lib/icons.jsx";

function Toggle({ checked, onChange, label, description, danger }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-om-border last:border-0">
      <div className="flex-1">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-om-text"}`}>{label}</p>
        {description && <p className="text-xs text-om-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`tv-focusable relative shrink-0 w-11 h-6 rounded-full transition-all duration-200 ${
          checked ? (danger ? "bg-red-500" : "bg-om-accent") : "bg-om-border"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const settings = useOmniStore((s) => s.settings);
  const updateSettings = useOmniStore((s) => s.updateSettings);
  const installedPlugins = useOmniStore((s) => s.installedPlugins);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Configurações</h1>
        <p className="text-om-muted text-sm mt-1">Preferências do aplicativo e controles de conteúdo.</p>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-mono font-semibold text-om-muted uppercase tracking-widest mb-2">
          Governança de Conteúdo
        </h2>
        <div className="bg-om-card border border-om-border rounded-xl px-4">
          <Toggle
            checked={settings.restrictedContentEnabled}
            onChange={(v) => updateSettings({ restrictedContentEnabled: v })}
            label="Conteúdo Sensível (+18)"
            description="Quando ativado, exibe plugins com conteúdo adulto no catálogo de extensões. Certifique-se de ter 18 anos ou mais."
            danger
          />
        </div>
      </section>

      {/* ── Leitura ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-mono font-semibold text-om-muted uppercase tracking-widest mb-2">
          Leitor de Imagens
        </h2>
        <div className="bg-om-card border border-om-border rounded-xl px-4">
          <div className="py-4 border-b border-om-border">
            <p className="text-sm font-medium text-om-text mb-2">Modo de leitura padrão</p>
            <div className="flex gap-2">
              {["cascade", "paged"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ readerMode: mode })}
                  className={`tv-focusable px-4 py-2 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    settings.readerMode === mode
                      ? "border-om-accent bg-om-accent/15 text-om-accent"
                      : "border-om-border text-om-muted hover:border-om-accent/30"
                  }`}
                >
                  {mode === "cascade" ? "↕ Cascata (vertical)" : "↔ Página por Página"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Interface ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-mono font-semibold text-om-muted uppercase tracking-widest mb-2">
          Interface
        </h2>
        <div className="bg-om-card border border-om-border rounded-xl px-4">
          <Toggle
            checked={settings.tvMode}
            onChange={(v) => updateSettings({ tvMode: v })}
            label="Modo TV (D-Pad / Controle Remoto)"
            description="Ativa navegação espacial por setas do teclado ou D-Pad, cursor oculto, fontes maiores e indicador de foco ampliado. Ideal para Android TV e smart TVs."
          />
        </div>

        {settings.tvMode && (
          <div className="mt-2 p-4 rounded-xl bg-om-accent/5 border border-om-accent/20 animate-fade-in">
            <p className="text-xs font-semibold text-om-accent mb-2">Atalhos ativos:</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-om-muted font-mono">
              {[
                ["↑ ↓ ← →", "navegar"],
                ["Enter / OK", "selecionar"],
                ["Esc", "voltar / fechar"],
                ["F", "fullscreen"],
                ["M", "mudo / alternar modo"],
                ["Space / K", "play/pause"],
              ].map(([key, action]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-om-text shrink-0">{key}</span>
                  <span>→ {action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Sobre ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-mono font-semibold text-om-muted uppercase tracking-widest mb-2">
          Sobre
        </h2>
        <div className="bg-om-card border border-om-border rounded-xl p-4 space-y-2 text-xs font-mono text-om-muted">
          <div className="flex justify-between">
            <span>Versão</span>
            <span className="text-om-text">1.0.0-patch10</span>
          </div>
          <div className="flex justify-between">
            <span>Extensões instaladas</span>
            <span className="text-om-text">{installedPlugins.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Licença</span>
            <span className="text-om-text">MIT (Open-Source)</span>
          </div>
          <div className="flex justify-between">
            <span>Armazenamento local</span>
            <span className="text-om-safe">Ativo</span>
          </div>
        </div>
      </section>
    </div>
  );
}
