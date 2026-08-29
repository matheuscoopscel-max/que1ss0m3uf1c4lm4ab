import Image from "next/image";

// Placeholder da Fase 1 (Fundação). A Landing Page de conversão de
// verdade (hero/benefícios/oferta/FAQ/CTA) é Fase 6 do A9.txt — ver README.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/brand/oni-logo.png"
        alt="OmniMedia"
        width={120}
        height={80}
        priority
        className="h-20 w-auto"
      />
      <h1 className="text-2xl font-semibold tracking-tight">OmniMedia — Cortes</h1>
      <p className="max-w-md text-zinc-400">
        Plataforma em construção. Acesso vitalício, pagamento único, sem
        mensalidade.
      </p>
    </div>
  );
}
