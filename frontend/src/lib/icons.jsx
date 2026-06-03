// FILE: frontend/src/lib/icons.js
// OmniMedia — Registro central de ícones.
// Mapeia nomes semânticos para os assets Streamline Ultimate.
// Todos os componentes importam daqui — nenhum emoji hardcoded.

const BASE = "/assets/icons";

export const Icons = {
  // ── Navegação ──────────────────────────────────────────────────────────────
  library:       `${BASE}/library.png`,
  extensions:    `${BASE}/extensions.png`,
  settings:      `${BASE}/settings.png`,
  home:          `${BASE}/home.png`,
  menu:          `${BASE}/menu.png`,
  arrowRight:    `${BASE}/arrow-right.png`,
  sortAsc:       `${BASE}/sort-asc.png`,
  sortDesc:      `${BASE}/sort-desc.png`,

  // ── Conteúdo / Tipos de mídia ──────────────────────────────────────────────
  ebook:         `${BASE}/ebook.png`,
  bookDownload:  `${BASE}/book-download.png`,
  imageReader:   `${BASE}/scroll-vertical.png`,
  paginated:     `${BASE}/scroll-horizontal.png`,
  videoPlay:     `${BASE}/video-play.png`,
  bookmark:      `${BASE}/bookmark.png`,

  // ── Ações ──────────────────────────────────────────────────────────────────
  search:        `${BASE}/search.png`,
  filter:        `${BASE}/filter.png`,
  filterOff:     `${BASE}/filter-off.png`,
  install:       `${BASE}/install.png`,
  delete:        `${BASE}/delete.png`,
  browserEdit:   `${BASE}/browser-edit.png`,
  checklist:     `${BASE}/checklist.png`,
  flash:         `${BASE}/flash.png`,

  // ── Status / Feedback ─────────────────────────────────────────────────────
  warning:       `${BASE}/warning.png`,
  lock:          `${BASE}/lock.png`,
  unlock:        `${BASE}/unlock.png`,
  badge:         `${BASE}/badge.png`,
  power:         `${BASE}/power.png`,
  monitorSettings: `${BASE}/monitor-settings.png`,
};

// Logo da aplicação
export const Logo = {
  oni: "/assets/logo/oni-logo.png",
};

/**
 * Componente React simples para renderizar um ícone Streamline.
 * Aceita tamanho e className. Os ícones são PNGs brancos/coloridos —
 * use CSS filter para recolorir se necessário.
 *
 * @param {{ name: keyof typeof Icons, size?: number, className?: string, alt?: string }} props
 */
export function Icon({ name, size = 20, className = "", alt = "", style }) {
  const src = Icons[name];
  if (!src) {
    console.warn(`[Icons] Ícone não encontrado: "${name}"`);
    return null;
  }
  return (
    <img
      src={src}
      alt={alt || name}
      width={size}
      height={size}
      className={`inline-block select-none ${className}`}
      style={style}
      draggable={false}
    />
  );
}
