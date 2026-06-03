// FILE: frontend/src/components/ui/Toast.jsx
// Sistema de notificações toast leve, sem dependências externas.
// Usa um store Zustand separado para não poluir o store principal.

import { create } from "zustand";
import { useEffect } from "react";

// ─── Toast Store (interno) ────────────────────────────────────────────────────
let nextId = 0;

const useToastStore = create((set) => ({
  toasts: [],

  add: (toast) => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    return id;
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

// ─── API pública (chamável fora de componentes) ───────────────────────────────

/**
 * Exibe um toast.
 * @param {{ message: string, type?: 'success'|'error'|'info'|'warning', duration?: number }} opts
 */
export function toast({ message, type = "info", duration = 4000 }) {
  const { add, remove } = useToastStore.getState();
  const id = add({ message, type });
  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }
  return id;
}

export const toastSuccess = (message, duration) => toast({ message, type: "success", duration });
export const toastError = (message, duration) => toast({ message, type: "error", duration: duration ?? 6000 });
export const toastInfo = (message, duration) => toast({ message, type: "info", duration });
export const toastWarning = (message, duration) => toast({ message, type: "warning", duration });

// ─── Componente de renderização ───────────────────────────────────────────────

const TYPE_STYLES = {
  success: {
    bar: "bg-om-safe",
    icon: "✓",
    iconColor: "text-om-safe",
    border: "border-om-safe/30",
  },
  error: {
    bar: "bg-om-danger",
    icon: "✕",
    iconColor: "text-om-danger",
    border: "border-om-danger/30",
  },
  warning: {
    bar: "bg-yellow-500",
    icon: "⚠",
    iconColor: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  info: {
    bar: "bg-om-accent",
    icon: "ℹ",
    iconColor: "text-om-accent",
    border: "border-om-accent/30",
  },
};

function ToastItem({ id, message, type }) {
  const remove = useToastStore((s) => s.remove);
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.info;

  return (
    <div
      className={`relative flex items-start gap-3 bg-om-card border ${style.border} rounded-xl px-4 py-3 shadow-xl shadow-black/40 animate-fade-in max-w-sm w-full overflow-hidden`}
      role="alert"
    >
      {/* Barra lateral colorida */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar} rounded-l-xl`} />

      {/* Ícone */}
      <span className={`${style.iconColor} font-bold text-sm mt-0.5 shrink-0 ml-1`}>
        {style.icon}
      </span>

      {/* Mensagem */}
      <p className="text-sm text-om-text leading-snug flex-1">{message}</p>

      {/* Fechar */}
      <button
        onClick={() => remove(id)}
        className="shrink-0 text-om-muted hover:text-om-text transition-colors text-xs leading-none mt-0.5"
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Renderizador global de toasts. Monte UMA VEZ no AppContent.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col-reverse gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
