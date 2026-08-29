import Image from "next/image";
import Link from "next/link";
import { getSetting } from "@/lib/settings/settings";
import { prisma } from "@/lib/database/prisma";

// Preço/categorias/config vêm do banco e são editáveis pelo Admin sem
// redeploy — precisa renderizar por request, senão fica preso no que
// existia no momento do `next build` (Next trata leitura de banco como
// estática por padrão se nada sinalizar o contrário).
export const dynamic = "force-dynamic";

const BENEFITS = [
  {
    n: "01",
    title: "Pagamento único",
    text: "R$14,90 uma vez só. Sem mensalidade, sem cobrança recorrente escondida.",
  },
  {
    n: "02",
    title: "Acesso vitalício",
    text: "Compra, entra e o acesso à biblioteca inteira não expira nunca.",
  },
  {
    n: "03",
    title: "Organizado por nicho",
    text: "Cada categoria já separada, pronto pra encaixar no seu perfil.",
  },
  {
    n: "04",
    title: "Baixa e posta",
    text: "Sem edição, sem crédito de terceiro pra pedir. Baixou, postou.",
  },
];

const FAQS = [
  {
    q: "Como eu recebo o acesso depois de pagar?",
    a: "Assim que o Mercado Pago confirma o pagamento, sua conta já libera a biblioteca automaticamente — não precisa esperar ninguém aprovar manualmente.",
  },
  {
    q: "É assinatura ou pago só uma vez?",
    a: "Pagamento único. Você paga uma vez e o acesso é vitalício, sem cobrança futura.",
  },
  {
    q: "Como funciona o download?",
    a: "Dentro da sua área, cada vídeo tem um botão de download direto — sem anúncio, sem espera, sem link quebrado.",
  },
  {
    q: "Tem grupo ou suporte?",
    a: "Sim, todo comprador recebe o convite pro grupo do Telegram junto com o acesso à plataforma.",
  },
];

export default async function Home() {
  const [instagramUrl, product, categories] = await Promise.all([
    getSetting("instagram_url", process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? null),
    prisma.product.findUnique({ where: { slug: "cortes-vitalicio" } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  const price = product ? Number(product.price).toFixed(2).replace(".", ",") : "14,90";
  const marqueeItems = categories.length > 0 ? [...categories, ...categories] : [];

  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <Image src="/brand/oni-logo.png" alt="OmniMedia" width={32} height={32} className="h-8 w-8" />
          <span className="text-sm font-medium tracking-tight">OMNIMEDIA</span>
        </div>
        <Link href="/login" className="text-sm text-zinc-400 hover:text-white">
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center overflow-hidden px-6 pt-8 pb-16 text-center sm:pt-14">
        <div
          aria-hidden
          className="oni-glow pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--color-oni-red)] blur-[100px] sm:h-96 sm:w-96"
        />
        <Image
          src="/brand/oni-logo.png"
          alt=""
          width={160}
          height={160}
          priority
          className="relative h-32 w-32 sm:h-40 sm:w-40"
        />
        <h1
          className="relative mt-6 max-w-3xl text-4xl leading-[0.95] tracking-tight sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-[var(--color-oni-red)]">+80 MIL CORTES</span>
          <br />
          PRONTOS PRA VIRALIZAR
        </h1>
        <p className="relative mt-5 max-w-md text-zinc-400">
          Vídeos prontos pra TikTok, Reels e Shorts, organizados por nicho.
          Baixa e posta — sem editar, sem gravar, sem esperar.
        </p>
        <Link
          href="/checkout"
          className="relative mt-8 rounded bg-[var(--color-oni-red)] px-8 py-4 text-sm font-semibold tracking-wide text-white transition hover:brightness-110"
        >
          QUERO ACESSO — R$ {price}
        </Link>
        <p className="relative mt-3 text-xs text-zinc-500">
          Pagamento único · Acesso vitalício · Sem mensalidade
        </p>
      </section>

      {/* Categorias — marquee com dados reais */}
      {marqueeItems.length > 0 && (
        <section className="border-y border-zinc-900 bg-zinc-950/50 py-4">
          <div className="flex overflow-hidden">
            <div className="marquee-track flex shrink-0 gap-3 pr-3">
              {marqueeItems.map((category, i) => (
                <span
                  key={`${category.id}-${i}`}
                  className="shrink-0 rounded-full border border-zinc-800 px-4 py-1.5 text-xs text-zinc-400"
                >
                  {category.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefícios */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-6 py-16 sm:grid-cols-2 sm:px-10">
        {BENEFITS.map((benefit) => (
          <div key={benefit.n} className="flex gap-4">
            <span
              className="shrink-0 text-3xl text-[var(--color-oni-cyan)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {benefit.n}
            </span>
            <div>
              <h3 className="font-medium text-zinc-100">{benefit.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{benefit.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Oferta */}
      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-md rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {product?.name ?? "Cortes — Acesso Vitalício"}
          </p>
          <p className="mt-3 text-5xl font-semibold">
            R$ {price}
          </p>
          <p className="mt-1 text-sm text-zinc-500">pagamento único</p>
          <ul className="mt-6 space-y-2 text-left text-sm text-zinc-300">
            {[
              "+80 mil cortes organizados por nicho",
              "Acesso vitalício, sem mensalidade",
              "Download direto, sem espera",
              "Grupo do Telegram incluso",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--color-oni-cyan)]">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/checkout"
            className="mt-8 block rounded bg-[var(--color-oni-red)] px-6 py-4 text-sm font-semibold tracking-wide text-white transition hover:brightness-110"
          >
            COMPRAR AGORA
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-10">
        <h2 className="text-center text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          PERGUNTAS FREQUENTES
        </h2>
        <div className="mt-8 divide-y divide-zinc-900">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-100">
                {faq.q}
                <span className="ml-4 text-zinc-500 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-zinc-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-zinc-900 px-6 py-16 text-center sm:px-10">
        <h2
          className="mx-auto max-w-lg text-3xl leading-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          PARE DE PERDER TEMPO PROCURANDO CONTEÚDO
        </h2>
        <Link
          href="/checkout"
          className="mt-8 inline-block rounded bg-[var(--color-oni-red)] px-8 py-4 text-sm font-semibold tracking-wide text-white transition hover:brightness-110"
        >
          QUERO ACESSO — R$ {price}
        </Link>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-3 border-t border-zinc-900 px-6 py-8 text-center text-xs text-zinc-600">
        <span>© {new Date().getFullYear()} OmniMedia</span>
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
          >
            Siga no Instagram
          </a>
        )}
      </footer>
    </div>
  );
}
