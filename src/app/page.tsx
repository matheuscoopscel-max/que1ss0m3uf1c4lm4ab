import Image from "next/image";
import Link from "next/link";

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
      <Link
        href="/checkout"
        className="rounded bg-white px-6 py-3 text-sm font-medium text-black"
      >
        Comprar agora
      </Link>
      {process.env.NEXT_PUBLIC_INSTAGRAM_URL && (
        <a
          href={process.env.NEXT_PUBLIC_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
        >
          Siga no Instagram
        </a>
      )}
    </div>
  );
}
