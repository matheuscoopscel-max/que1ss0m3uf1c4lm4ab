// FILE: frontend/src/components/ui/XPBar.jsx
import { useXP } from "../../hooks/useXP";
import { useOmniStore } from "../../lib/store";

export function XPBar({ compact = false }) {
  const user = useOmniStore((s) => s.user);
  const { xpData, levelUp } = useXP();

  if (!user || !xpData) return null;

  const { level, xpInLevel, xpForNext, progress } = xpData;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="badge bg-om-accent/20 text-om-accent border border-om-accent/30 text-[10px] font-bold font-mono">
          Nv.{level}
        </span>
        <div className="w-20 h-1.5 bg-om-border rounded-full overflow-hidden">
          <div className="h-full bg-om-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        {levelUp && (
          <span className="text-xs font-bold text-yellow-400 animate-slide-up">
            ⬆ Nível {levelUp.level}!
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-om-accent text-sm">Nível {level}</span>
          {levelUp && (
            <span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-scale-in">
              ⬆ Level Up!
            </span>
          )}
        </div>
        <span className="text-om-muted font-mono">{xpInLevel} / {xpForNext} XP</span>
      </div>
      <div className="h-2.5 bg-om-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-om-accent to-yellow-400 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[11px] text-om-muted font-mono text-right">
        {xpData.totalXp.toLocaleString("pt-BR")} XP total · Rank #{xpData.rank ?? "—"}
      </p>
    </div>
  );
}
