// FILE: frontend/src/components/ui/VIPBadge.jsx
// Badge 👑 VIP exibida no perfil e avatar do usuário.

/**
 * @param {{ size?: 'sm' | 'md' | 'lg', className?: string }} props
 */
export function VIPBadge({ size = "sm", className = "" }) {
  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold
                      bg-gradient-to-r from-yellow-500/20 to-amber-500/20
                      border border-yellow-500/40 text-yellow-400
                      ${sizes[size]} ${className}`}>
      <span>👑</span>
      <span>VIP</span>
    </span>
  );
}
