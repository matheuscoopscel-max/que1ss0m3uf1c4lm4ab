// FILE: frontend/src/components/ui/PageTransition.jsx
// Wrapper que aplica uma animação de entrada em cada troca de página.
// Usa uma key que muda ao trocar de aba para forçar re-montagem + animação.

import { useRef, useEffect, useState } from "react";

/**
 * @param {{ children: React.ReactNode, pageKey: string }} props
 */
export function PageTransition({ children, pageKey }) {
  const [displayKey, setDisplayKey] = useState(pageKey);
  const [animating,  setAnimating]  = useState(false);
  const prevKey = useRef(pageKey);

  useEffect(() => {
    if (pageKey === prevKey.current) return;
    setAnimating(true);
    const t = setTimeout(() => {
      setDisplayKey(pageKey);
      prevKey.current = pageKey;
      setAnimating(false);
    }, 120); // metade da duração do fade-out
    return () => clearTimeout(t);
  }, [pageKey]);

  return (
    <div
      key={displayKey}
      className={`transition-all duration-200 ${
        animating
          ? "opacity-0 translate-y-1"
          : "opacity-100 translate-y-0 animate-fade-in"
      }`}
    >
      {children}
    </div>
  );
}
