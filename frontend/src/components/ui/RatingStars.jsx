// FILE: frontend/src/components/ui/RatingStars.jsx
// Exibe avaliação em estrelas. Suporta valores de 0–5 com meia estrela.

/**
 * @param {{
 *   value: number,      // 0–5
 *   max?: number,       // padrão 5
 *   size?: 'sm'|'md'|'lg',
 *   showValue?: boolean,
 *   count?: number,     // número de avaliações
 * }} props
 */
export function RatingStars({ value = 0, max = 5, size = "sm", showValue = false, count }) {
  const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
  const iconSize = sizes[size] ?? sizes.sm;

  const stars = Array.from({ length: max }, (_, i) => {
    const filled = value - i;
    if (filled >= 1)   return "full";
    if (filled >= 0.5) return "half";
    return "empty";
  });

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {stars.map((type, i) => (
          <svg key={i} viewBox="0 0 24 24" className={iconSize}>
            {type === "full" && (
              <path fill="#e8841a" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            )}
            {type === "half" && (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="#e8841a" />
                    <stop offset="50%" stopColor="#22222e" />
                  </linearGradient>
                </defs>
                <path fill={`url(#half-${i})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </>
            )}
            {type === "empty" && (
              <path fill="#22222e" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            )}
          </svg>
        ))}
      </div>

      {showValue && (
        <span className="text-xs font-mono text-om-accent font-semibold">
          {value.toFixed(1)}
        </span>
      )}

      {count !== undefined && (
        <span className="text-[11px] text-om-muted font-mono">
          ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
        </span>
      )}
    </div>
  );
}
