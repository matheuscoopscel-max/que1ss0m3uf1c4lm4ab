// FILE: frontend/src/components/community/PostCard.jsx — Patch #22
// Reescrito estilo Twitter: inline comments, hashtags, menções, reaction picker.

import { useState, useCallback } from "react";
import { useOmniStore } from "../../lib/store";
import { api } from "../../lib/api";
import { triggerCoinsRefresh } from "../shop/OmniCoinsBalance";
import { triggerXPRefresh } from "../../hooks/useXP";

const REACTIONS = [
  { value: "like",  emoji: "👍", label: "Curtir"   },
  { value: "love",  emoji: "❤️", label: "Amar"     },
  { value: "fire",  emoji: "🔥", label: "Incrível" },
  { value: "laugh", emoji: "😂", label: "Haha"     },
];

function formatTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return "agora"; if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`; if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function RichText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\s#[\w]+|^#[\w]+|\s@[\w]+|^@[\w]+)/gm);
  return (
    <span>
      {parts.map((part, i) => {
        const t = part.trimStart();
        if (t.startsWith("#")) return <span key={i} className="text-om-accent font-medium hover:underline cursor-pointer">{part}</span>;
        if (t.startsWith("@")) return <span key={i} className="text-sky-400 font-medium hover:underline cursor-pointer">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function CommentThread({ postId, isOpen }) {
  const user = useOmniStore((s) => s.user);
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [replyTo,  setReplyTo]  = useState(null);

  if (!isOpen) return null;

  if (!loaded && !loading) {
    setLoading(true);
    api.get(`/community/posts/${postId}/comments`).then(async (r) => {
      if (r.ok) setComments((await r.json()).comments ?? []);
      setLoading(false); setLoaded(true);
    });
  }

  async function sendComment() {
    if (!input.trim() || !user) return;
    setSending(true);
    const res = await api.post(`/community/posts/${postId}/comments`, { content: input, parentId: replyTo?.id ?? null });
    setSending(false);
    if (res.ok) {
      const { comment } = await res.json();
      setComments((c) => [...c, comment]);
      setInput(""); setReplyTo(null);
      triggerCoinsRefresh();
      triggerXPRefresh();
    }
  }

  const roots    = comments.filter((c) => !c.parentId);
  const byParent = comments.reduce((acc, c) => {
    if (c.parentId) acc[c.parentId] = [...(acc[c.parentId] ?? []), c];
    return acc;
  }, {});

  function Comment({ c, depth = 0 }) {
    return (
      <div className={depth > 0 ? "ml-8 border-l-2 border-om-border pl-3" : ""}>
        <div className="flex gap-2 py-2">
          <div className="w-7 h-7 shrink-0 rounded-full bg-om-accent/20 border border-om-accent/20 flex items-center justify-center overflow-hidden">
            {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-[10px] font-bold text-om-accent">{c.username?.slice(0,2).toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-om-text">@{c.username}</span>
              <span className="text-[10px] text-om-muted font-mono">{formatTime(c.createdAt)}</span>
            </div>
            <p className="text-sm text-om-text leading-relaxed mt-0.5"><RichText text={c.content} /></p>
            {user && depth === 0 && (
              <button onClick={() => setReplyTo({ id: c.id, username: c.username })}
                className="text-[11px] text-om-muted hover:text-om-accent transition-colors mt-1">
                Responder
              </button>
            )}
          </div>
        </div>
        {byParent[c.id]?.map((r) => <Comment key={r.id} c={r} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div className="border-t border-om-border bg-om-surface/30 px-4 pb-3 animate-fade-in">
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 rounded-full border-2 border-om-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="pt-2">
          {roots.length === 0
            ? <p className="text-xs text-om-muted text-center py-3">Nenhum comentário ainda.</p>
            : roots.map((c) => <Comment key={c.id} c={c} />)}
        </div>
      )}

      {user && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-om-border">
          <div className="flex-1 space-y-1">
            {replyTo && (
              <div className="flex items-center gap-1 text-[11px] text-om-muted">
                <span>↩ @{replyTo.username}</span>
                <button onClick={() => setReplyTo(null)} className="text-om-danger hover:underline ml-1">✕</button>
              </div>
            )}
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendComment()}
              placeholder={replyTo ? `Responder @${replyTo.username}…` : "Comentar… (+2 🪙)"}
              className="w-full bg-om-card border border-om-border rounded-xl px-3 py-2 text-sm text-om-text placeholder:text-om-muted/50 outline-none focus:border-om-accent/50 transition-colors" />
          </div>
          <button onClick={sendComment} disabled={!input.trim() || sending}
            className="tv-focusable self-end px-3 py-2 rounded-xl bg-om-accent hover:bg-om-accent-dim text-white text-xs font-semibold disabled:opacity-50 transition-all">
            {sending ? "…" : "↑"}
          </button>
        </div>
      )}
    </div>
  );
}

export function PostCard({ post }) {
  const user = useOmniStore((s) => s.user);
  const [likes,       setLikes]      = useState(post.likesCount ?? 0);
  const [reaction,    setReaction]   = useState(post.userReaction ?? null);
  const [showPicker,  setShowPicker] = useState(false);
  const [showThread,  setShowThread] = useState(false);

  const react = useCallback(async (type) => {
    if (!user) return;
    const prev = reaction;
    const newR = prev === type ? null : type;
    setReaction(newR);
    setLikes((l) => newR ? (prev ? l : l + 1) : Math.max(0, l - 1));
    setShowPicker(false);
    await api.post(`/community/posts/${post.id}/react`, { reaction: type });
  }, [user, reaction, post.id]);

  return (
    <article className="bg-om-card border border-om-border rounded-2xl overflow-hidden hover:border-om-accent/20 transition-all duration-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 shrink-0 rounded-full bg-om-accent/20 border border-om-accent/30 overflow-hidden flex items-center justify-center">
          {post.avatarUrl ? <img src={post.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-om-accent">{post.username?.slice(0,2).toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-om-text">@{post.username}</span>
            <span className="text-[11px] text-om-muted font-mono">· {formatTime(post.createdAt)}</span>
            {post.isPinned && <span className="badge bg-om-accent/15 text-om-accent text-[10px]">📌 fixado</span>}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 pb-3">
        <p className="text-sm text-om-text leading-relaxed whitespace-pre-wrap">
          <RichText text={post.content} />
        </p>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="mt-3 w-full rounded-xl object-cover max-h-72 border border-om-border" />
        )}
        {post.itemId && (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-om-surface border border-om-border">
            {post.itemCoverUrl && <img src={post.itemCoverUrl} alt="" className="w-10 h-12 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs text-om-muted">Sobre</p>
              <p className="text-sm font-semibold text-om-text truncate">{post.itemTitle}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {(likes > 0 || post.commentsCount > 0) && (
        <div className="flex gap-3 px-4 py-1.5 border-t border-om-border/50 text-[11px] text-om-muted font-mono">
          {post.commentsCount > 0 && <span>{post.commentsCount} coment.</span>}
          {likes > 0 && <span>{likes} curtida{likes !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center border-t border-om-border px-2 py-1">
        {/* Comentar */}
        <button onClick={() => setShowThread((v) => !v)}
          className={`tv-focusable flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-medium transition-colors ${
            showThread ? "text-om-accent bg-om-accent/5" : "text-om-muted hover:text-om-text hover:bg-om-surface"
          }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          Comentar
        </button>

        {/* Reagir */}
        <div className="relative flex-1 flex justify-center">
          <button onMouseEnter={() => user && setShowPicker(true)} onMouseLeave={() => setShowPicker(false)}
            onClick={() => user && react("like")}
            className={`tv-focusable flex items-center gap-1.5 w-full justify-center py-2 rounded-xl text-xs font-medium transition-colors ${
              reaction ? "text-om-accent bg-om-accent/5" : "text-om-muted hover:text-om-text hover:bg-om-surface"
            }`}>
            <span className="text-base leading-none">
              {reaction ? REACTIONS.find((r) => r.value === reaction)?.emoji ?? "👍" : "👍"}
            </span>
            <span>Curtir{likes > 0 ? ` · ${likes}` : ""}</span>
          </button>
          {showPicker && user && (
            <div className="absolute bottom-full mb-1 flex gap-1 bg-om-card border border-om-border rounded-2xl p-2 shadow-xl z-10"
              onMouseEnter={() => setShowPicker(true)} onMouseLeave={() => setShowPicker(false)}>
              {REACTIONS.map((r) => (
                <button key={r.value} onClick={() => react(r.value)} title={r.label}
                  className={`tv-focusable text-xl w-9 h-9 rounded-xl flex items-center justify-center hover:bg-om-surface hover:scale-125 transition-all ${
                    reaction === r.value ? "bg-om-accent/20 scale-110" : ""
                  }`}>
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share */}
        <button className="tv-focusable flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-medium text-om-muted hover:text-om-text hover:bg-om-surface transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
          Compartilhar
        </button>
      </div>

      {/* Thread inline */}
      <CommentThread postId={post.id} isOpen={showThread} />
    </article>
  );
}
