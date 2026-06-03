// FILE: frontend/src/pages/ProfilePage.jsx
// Página de perfil do usuário — exibe banner, avatar, bio, stats e atividade.
// Quando é o próprio usuário: mostra formulário de edição inline.

import { useState } from "react";
import { useOmniStore } from "../lib/store";
import { useMyProfile } from "../hooks/useProfile";
import { AvatarUpload } from "../components/profile/AvatarUpload";
import { StatsGrid }    from "../components/profile/StatsGrid";
import { ActivityFeed } from "../components/profile/ActivityFeed";
import { Icon }            from "../lib/icons.jsx";
import { VIPBadge }       from "../components/ui/VIPBadge";
import { XPBar }          from "../components/ui/XPBar";
import { useSubscription } from "../hooks/useSubscription";

// ── Formulário de edição inline ───────────────────────────────────────────────
function EditProfileForm({ profile, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    displayName: profile?.displayName ?? "",
    bio:         profile?.bio         ?? "",
    websiteUrl:  profile?.websiteUrl  ?? "",
    isPublic:    profile?.isPublic    ?? true,
  });

  function field(key) {
    return {
      value:    form[key],
      onChange: (e) => setForm((s) => ({ ...s, [key]: e.target.value })),
    };
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1">
        <label className="text-xs font-medium text-om-muted">Nome de exibição</label>
        <input {...field("displayName")} placeholder="Seu nome" maxLength={100}
          className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors" />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-om-muted">Bio <span className="text-om-muted/60">({form.bio.length}/500)</span></label>
        <textarea {...field("bio")} placeholder="Conte um pouco sobre você…" maxLength={500} rows={3}
          className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60 transition-colors resize-none" />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-om-muted">Website</label>
        <input {...field("websiteUrl")} type="url" placeholder="https://meusite.com"
          className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text font-mono outline-none focus:border-om-accent/60 transition-colors" />
      </div>

      <div className="flex items-center justify-between py-3 border-t border-om-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-om-text">Perfil público</span>
          <button
            type="button"
            onClick={() => setForm((s) => ({ ...s, isPublic: !s.isPublic }))}
            className={`relative w-11 h-6 rounded-full transition-all duration-200 ${form.isPublic ? "bg-om-accent" : "bg-om-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.isPublic ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="tv-focusable px-4 py-2 rounded-xl text-sm text-om-muted hover:text-om-text border border-om-border hover:bg-om-surface transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="tv-focusable flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-om-accent hover:bg-om-accent-dim text-white transition-colors disabled:opacity-60">
            {saving && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function ProfilePage() {
  const user = useOmniStore((s) => s.user);
  const { isVip } = useSubscription();
  const { profile, stats, activity, loading, saving, updateProfile, uploadAvatar, uploadBanner } = useMyProfile();

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("stats"); // stats | activity

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Icon name="lock" size={48} className="opacity-20" style={{ filter: "brightness(0) invert(1)" }} />
        <p className="text-om-muted text-sm">Faça login para ver e editar seu perfil.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="flex gap-4 px-6">
          <div className="skeleton w-24 h-24 rounded-full -mt-12" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-3 w-64" />
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.displayName || user.username;

  async function handleSave(data) {
    await updateProfile(data);
    setEditing(false);
  }

  return (
    <div className="max-w-3xl space-y-0 animate-fade-in">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div
        className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-om-accent/30 via-om-surface to-om-card border border-om-border cursor-pointer group"
        onClick={() => document.getElementById("banner-input")?.click()}
        title="Clique para alterar o banner"
      >
        {profile?.bannerUrl ? (
          <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-om-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              Clique para adicionar um banner
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            ✎ Alterar banner
          </span>
        </div>
        <input id="banner-input" type="file" accept="image/*" className="sr-only"
          onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
      </div>

      {/* ── Avatar + Info ───────────────────────────────────────────────────── */}
      <div className="flex items-end gap-4 px-4 -mt-12 mb-4">
        <AvatarUpload
          currentUrl={profile?.avatarUrl}
          username={user.username}
          onUpload={uploadAvatar}
          size={96}
          editable
        />
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-xl text-om-text">{displayName}</h1>
            {isVip && <VIPBadge size="sm" />}
            {profile?.badgeSlug && (
              <span className="badge bg-om-accent/15 text-om-accent border border-om-accent/20 text-[10px]">
                {profile.badgeSlug}
              </span>
            )}
            {!profile?.isPublic && (
              <span className="badge bg-om-surface text-om-muted border border-om-border text-[10px]">
                privado
              </span>
            )}
          </div>
          <p className="text-sm text-om-muted">@{user.username}</p>
          {profile?.websiteUrl && (
            <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-om-accent hover:underline mt-0.5 inline-block"
              onClick={(e) => e.stopPropagation()}>
              {profile.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {/* Botão editar */}
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="tv-focusable shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-om-border hover:border-om-accent/40 text-om-muted hover:text-om-text text-xs font-medium transition-colors bg-om-surface">
            <Icon name="browserEdit" size={13} style={{ filter: "brightness(0) invert(0.6)" }} />
            Editar perfil
          </button>
        )}
      </div>

      {/* ── XP Bar ─────────────────────────────────────────────────────────── */}
      <div className="px-4 mb-2">
        <XPBar compact={false} />
      </div>

      {/* ── Bio ────────────────────────────────────────────────────────────── */}
      {!editing && profile?.bio && (
        <div className="px-4 mb-4">
          <p className="text-sm text-om-muted leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* ── Formulário de edição ────────────────────────────────────────────── */}
      {editing && (
        <div className="px-4 mb-6 bg-om-surface border border-om-border rounded-2xl p-4">
          <EditProfileForm
            profile={profile}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving}
          />
        </div>
      )}

      {/* ── Abas Stats / Atividade ──────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit mb-4">
          {[
            { id: "stats",    label: "Estatísticas" },
            { id: "activity", label: "Atividade recente" },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`tv-focusable px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === id ? "bg-om-card text-om-text shadow-sm" : "text-om-muted hover:text-om-text"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "stats"    && <StatsGrid stats={stats} />}
        {activeTab === "activity" && <ActivityFeed activity={activity} username={user.username} />}
      </div>
    </div>
  );
}
