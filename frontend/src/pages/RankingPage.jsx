// FILE: frontend/src/pages/RankingPage.jsx
import { useState, useEffect } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";
import { XPBar } from "../components/ui/XPBar";

function MedalIcon({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-mono text-om-muted tabular-nums">#{rank}</span>;
}

function LevelBadge({ level }) {
  const color = level >= 50 ? "from-yellow-500 to-amber-400" :
                level >= 20 ? "from-violet-500 to-purple-400" :
                level >= 10 ? "from-sky-500 to-blue-400" :
                              "from-om-accent to-orange-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${color} font-mono`}>
      Nv.{level}
    </span>
  );
}

export function RankingPage() {
  const user         = useOmniStore((s) => s.user);
  const [tab,        setTab]        = useState("ranking");
  const [ranking,    setRanking]    = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchRanking = () =>
      fetch("/api/ranking/list?limit=50").then((r) => r.json()).then((d) => setRanking(d.ranking ?? []));
    const fetchAchievements = () =>
      api.get("/achievements/catalog").then((r) => r.ok ? r.json() : null).then((d) => d && setAchievements(d.achievements ?? []));

    Promise.all([fetchRanking(), fetchAchievements()]).finally(() => setLoading(false));
  }, []);

  const myEntry = user ? ranking.find((r) => r.userId === user?.id) : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Ranking & Conquistas</h1>
        <p className="text-om-muted text-sm mt-0.5">Ganhe XP lendo, assistindo e participando da comunidade.</p>
      </div>

      {/* Minha posição + barra XP */}
      {user && myEntry && (
        <div className="bg-om-card border border-om-accent/30 rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <MedalIcon rank={myEntry.rank} />
            <div className="w-9 h-9 rounded-full bg-om-accent/20 border border-om-accent/30 flex items-center justify-center">
              <span className="text-xs font-bold text-om-accent">{user.username.slice(0,2).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-om-text">@{user.username} <span className="text-om-muted font-normal">· você</span></p>
              <p className="text-xs text-om-muted">{myEntry.chaptersRead} cap. · {myEntry.titlesCompleted} conc.</p>
            </div>
            <LevelBadge level={myEntry.level} />
          </div>
          <XPBar />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
        {[["ranking","🏆 Ranking"],["achievements","🎯 Conquistas"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`tv-focusable px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id ? "bg-om-card text-om-text shadow-sm" : "text-om-muted hover:text-om-text"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-14 rounded-2xl"/>)}</div>
      ) : tab === "ranking" ? (
        <div className="bg-om-card border border-om-border rounded-2xl overflow-hidden">
          {ranking.length === 0 ? (
            <div className="text-center py-12 text-om-muted text-sm">Nenhum dado de ranking ainda.</div>
          ) : ranking.map((entry, i) => (
            <div key={entry.userId}
              className={`flex items-center gap-3 px-4 py-3 border-b border-om-border last:border-0 hover:bg-om-surface/50 transition-colors ${
                entry.userId === user?.id ? "bg-om-accent/5" : ""
              }`}>
              <div className="w-8 text-center shrink-0"><MedalIcon rank={entry.rank} /></div>

              <div className="w-8 h-8 rounded-full bg-om-accent/20 border border-om-accent/20 overflow-hidden flex items-center justify-center shrink-0">
                {entry.avatarUrl
                  ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-om-accent">{entry.username.slice(0,2).toUpperCase()}</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-om-text truncate">@{entry.username}</p>
                  <LevelBadge level={entry.level} />
                </div>
                <div className="flex gap-3 text-[11px] text-om-muted font-mono mt-0.5">
                  <span>📖 {entry.chaptersRead} cap.</span>
                  <span>✅ {entry.titlesCompleted} conc.</span>
                  <span>💬 {entry.postsCreated} posts</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-om-accent font-mono">{entry.totalXp.toLocaleString("pt-BR")}</p>
                <p className="text-[10px] text-om-muted">XP</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Conquistas
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((ach) => (
            <div key={ach.slug}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                ach.unlocked
                  ? "bg-om-card border-om-accent/30"
                  : "bg-om-surface border-om-border opacity-60"
              }`}>
              <span className={`text-2xl shrink-0 ${!ach.unlocked ? "grayscale opacity-50" : ""}`}>{ach.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-om-text">{ach.name}</p>
                  {ach.unlocked && <span className="badge bg-om-safe/15 text-om-safe border border-om-safe/20 text-[10px]">✓ Desbloqueada</span>}
                </div>
                <p className="text-xs text-om-muted mt-0.5 leading-relaxed">{ach.description}</p>
                <div className="flex gap-2 mt-2 text-[11px] font-mono">
                  {ach.xpReward > 0 && <span className="text-violet-400">+{ach.xpReward} XP</span>}
                  {ach.coinsReward > 0 && <span className="text-yellow-400">+{ach.coinsReward} 🪙</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
