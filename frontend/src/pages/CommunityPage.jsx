// FILE: frontend/src/pages/CommunityPage.jsx — Patch #22
// Feed estilo Twitter: scroll infinito, abas (Para Você/Trending/Grupos),
// composer com suporte a hashtags, notificações integradas.

import { useState, useEffect, useCallback, useRef } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";
import { PostCard } from "../components/community/PostCard";
import { toastError } from "../components/ui/Toast";
import { triggerCoinsRefresh } from "../components/shop/OmniCoinsBalance";
import { triggerXPRefresh } from "../hooks/useXP";

const PAGE_SIZE = 20;

// ── Composer ──────────────────────────────────────────────────────────────────
function PostComposer({ onPosted }) {
  const user = useOmniStore((s) => s.user);
  const [content,   setContent]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const textRef = useRef(null);

  if (!user) return (
    <div className="bg-om-card border border-om-border rounded-2xl p-4 text-center">
      <p className="text-sm text-om-muted">Faça <span className="text-om-accent cursor-pointer hover:underline" onClick={() => {}}>login</span> para publicar no feed.</p>
    </div>
  );

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    const res  = await api.post("/community/posts", { content });
    setLoading(false);
    if (res.ok) {
      const { post } = await res.json();
      setContent("");
      setExpanded(false);
      onPosted(post);
      triggerCoinsRefresh();
      triggerXPRefresh();
    } else {
      toastError("Erro ao publicar.");
    }
  }

  const charCount  = content.length;
  const charLimit  = 2000;
  const charColor  = charCount > charLimit * 0.9 ? "text-om-danger" : "text-om-muted";

  return (
    <div className="bg-om-card border border-om-border rounded-2xl p-4 space-y-3">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 shrink-0 rounded-full bg-om-accent/20 border border-om-accent/30 flex items-center justify-center">
          <span className="text-xs font-bold text-om-accent">{user.username.slice(0,2).toUpperCase()}</span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); setExpanded(true); }}
          onFocus={() => setExpanded(true)}
          placeholder="O que você está pensando? Use #hashtags e @menções…"
          rows={expanded ? 3 : 1}
          maxLength={charLimit}
          className="flex-1 bg-transparent text-sm text-om-text placeholder:text-om-muted/50 outline-none resize-none transition-all duration-200"
        />
      </div>

      {expanded && (
        <div className="flex items-center justify-between pl-12 animate-fade-in">
          <div className="flex gap-2 text-om-muted text-xs">
            <span title="Hashtag"># hashtag</span>
            <span className="opacity-40">·</span>
            <span title="Menção">@ menção</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono ${charColor}`}>{charCount}/{charLimit}</span>
            <button onClick={() => { setExpanded(false); setContent(""); }}
              className="text-xs text-om-muted hover:text-om-text transition-colors">Cancelar</button>
            <button onClick={submit} disabled={!content.trim() || loading}
              className="tv-focusable flex items-center gap-1.5 px-4 py-2 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-xs font-semibold disabled:opacity-50 transition-all active:scale-95">
              {loading ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : null}
              Publicar · +5 🪙
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feed com scroll infinito ──────────────────────────────────────────────────
function PostFeed({ endpoint, emptyMessage }) {
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [offset,   setOffset]   = useState(0);
  const loaderRef = useRef(null);

  const fetchPosts = useCallback(async (currentOffset = 0, reset = false) => {
    if (loading) return;
    setLoading(true);
    const res  = await fetch(`/api${endpoint}&limit=${PAGE_SIZE}&offset=${currentOffset}`);
    const data = res.ok ? await res.json() : null;
    const newPosts = data?.posts ?? [];

    if (reset) {
      setPosts(newPosts);
    } else {
      setPosts((p) => [...p, ...newPosts]);
    }
    setHasMore(newPosts.length === PAGE_SIZE);
    setOffset(currentOffset + newPosts.length);
    setLoading(false);
  }, [endpoint, loading]);

  // Fetch inicial
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPosts(0, true);
  }, [endpoint]);

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPosts(offset);
        }
      },
      { threshold: 0.5 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, offset, fetchPosts]);

  if (!loading && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">💬</p>
        <p className="text-om-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => <PostCard key={post.id} post={post} />)}

      {/* Loader de scroll infinito */}
      <div ref={loaderRef} className="flex justify-center py-4">
        {loading && (
          <div className="w-5 h-5 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
        )}
        {!loading && !hasMore && posts.length > 0 && (
          <p className="text-xs text-om-muted">Você chegou ao fim 🎉</p>
        )}
      </div>
    </div>
  );
}

// ── Aba de Grupos ─────────────────────────────────────────────────────────────
function GroupsTab() {
  const user = useOmniStore((s) => s.user);
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [form,     setForm]     = useState({ name: "", slug: "", description: "", genre: "" });

  useEffect(() => {
    fetch("/api/community/groups")
      .then((r) => r.json())
      .then((d) => { setGroups(d.groups ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name || !form.slug) return;
    const res  = await api.post("/community/groups", form);
    const data = await res.json();
    if (res.ok) { setGroups((g) => [data.group, ...g]); setCreating(false); setForm({ name: "", slug: "", description: "", genre: "" }); }
    else toastError(data.message ?? "Erro ao criar grupo.");
  }

  async function handleJoin(groupId) {
    if (!user) return;
    await api.post(`/community/groups/${groupId}/join`, {});
    setGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, memberCount: g.memberCount + 1, userRole: "member" } : g));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-om-muted">{groups.length} grupo{groups.length !== 1 ? "s" : ""}</p>
        {user && (
          <button onClick={() => setCreating((v) => !v)}
            className="tv-focusable px-3 py-1.5 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-xs font-semibold transition-all">
            + Criar grupo
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-om-card border border-om-border rounded-2xl p-4 space-y-3 animate-fade-in">
          <h3 className="font-display font-semibold text-om-text text-sm">Novo grupo</h3>
          {[["name","Nome","text"],["slug","slug-do-grupo","text"],["description","Descrição (opcional)","text"],["genre","Gênero (opcional)","text"]].map(([k,ph,t]) => (
            <input key={k} type={t} placeholder={ph} value={form[k]}
              onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
              className="w-full bg-om-surface border border-om-border rounded-xl px-4 py-2.5 text-sm text-om-text outline-none focus:border-om-accent/60" />
          ))}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="tv-focusable px-3 py-2 rounded-xl text-xs text-om-muted border border-om-border hover:bg-om-surface">Cancelar</button>
            <button onClick={handleCreate} disabled={!form.name||!form.slug}
              className="tv-focusable px-4 py-2 rounded-xl bg-om-accent text-white text-xs font-semibold disabled:opacity-50">Criar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12"><p className="text-om-muted text-sm">Nenhum grupo ainda.</p></div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center gap-3 p-4 bg-om-card border border-om-border rounded-2xl hover:border-om-accent/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-om-accent/20 flex items-center justify-center shrink-0">
                <span className="font-bold text-om-accent text-sm">{g.name.slice(0,2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-om-text truncate">{g.name}</p>
                <p className="text-[11px] text-om-muted">{g.memberCount} membro{g.memberCount !== 1 ? "s" : ""}{g.genre ? ` · ${g.genre}` : ""}</p>
              </div>
              {user && !g.userRole && (
                <button onClick={() => handleJoin(g.id)}
                  className="tv-focusable px-3 py-1.5 rounded-xl bg-om-accent/15 text-om-accent border border-om-accent/20 text-xs font-semibold hover:bg-om-accent/25 transition-colors shrink-0">
                  Entrar
                </button>
              )}
              {g.userRole && <span className="badge bg-om-safe/15 text-om-safe border border-om-safe/20 text-[10px] shrink-0">membro</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function CommunityPage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [feedKey,   setFeedKey]   = useState(0); // força re-fetch ao postar

  const TABS = [
    { id: "feed",     label: "Para Você"  },
    { id: "trending", label: "🔥 Trending" },
    { id: "groups",   label: "Grupos"     },
  ];

  function handlePosted() {
    // Re-inicia o feed para o novo post aparecer no topo
    setFeedKey((k) => k + 1);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Comunidade</h1>
        <p className="text-om-muted text-sm mt-0.5">Compartilhe o que você está lendo ou assistindo.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 bg-om-card border border-om-border rounded-2xl overflow-hidden">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`tv-focusable flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeTab === id
                ? "text-om-accent border-om-accent bg-om-accent/5"
                : "text-om-muted border-transparent hover:text-om-text hover:bg-om-surface"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Composer — só no feed principal */}
      {activeTab === "feed" && <PostComposer onPosted={handlePosted} />}

      {/* Conteúdo */}
      {activeTab === "feed" && (
        <PostFeed
          key={feedKey}
          endpoint="/community/posts?"
          emptyMessage="Nenhum post ainda. Seja o primeiro a publicar!"
        />
      )}

      {activeTab === "trending" && (
        <PostFeed
          endpoint="/community/trending?"
          emptyMessage="Nenhum trending nas últimas 48h. Poste algo!"
        />
      )}

      {activeTab === "groups" && <GroupsTab />}
    </div>
  );
}
