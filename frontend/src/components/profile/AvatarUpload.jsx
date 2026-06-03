// FILE: frontend/src/components/profile/AvatarUpload.jsx
// Avatar clicável que abre o file picker. Mostra preview imediato.

import { useRef, useState } from "react";

/**
 * @param {{
 *   currentUrl: string|null,
 *   username: string,
 *   onUpload: (file: File) => Promise<{success:boolean}>,
 *   size?: number,
 *   editable?: boolean
 * }} props
 */
export function AvatarUpload({ currentUrl, username, onUpload, size = 96, editable = true }) {
  const inputRef   = useRef(null);
  const [preview, setPreview] = useState(null);
  const [loading,  setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview imediato
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setLoading(true);
    await onUpload(file);
    setLoading(false);
  }

  const displayUrl = preview || currentUrl;
  const initials   = username?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div
      className={`relative shrink-0 ${editable ? "cursor-pointer group" : ""}`}
      style={{ width: size, height: size }}
      onClick={() => editable && inputRef.current?.click()}
      title={editable ? "Clique para alterar o avatar" : ""}
    >
      {/* Avatar */}
      <div
        className="w-full h-full rounded-full overflow-hidden border-2 border-om-border bg-om-surface flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={username}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            className="font-display font-bold text-om-accent"
            style={{ fontSize: size * 0.35 }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Overlay de edição */}
      {editable && (
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <span className="text-white text-xs font-medium">✎</span>
          )}
        </div>
      )}

      {/* Ring de foco */}
      {editable && (
        <div className="absolute inset-0 rounded-full ring-0 focus-within:ring-2 ring-om-accent ring-offset-2 ring-offset-om-bg" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  );
}
