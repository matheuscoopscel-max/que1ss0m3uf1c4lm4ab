import "dotenv/config";
import { prisma } from "../src/lib/database/prisma";

// Seed de desenvolvimento — cria o produto único (pack vitalício) e as
// categorias reais do acervo (mesmos nomes das pastas em Packs/), com
// alguns Content de exemplo (storageKey placeholder — sem arquivo real
// no R2 ainda). Idempotente via slug.

const CATEGORIES = [
  "Achadinho Shopee",
  "Animais Fofos",
  "Cidades",
  "Natureza",
  "Natureza - IA",
  "Tiktoks Virais",
  "Vídeos Falantes",
  "Yates",
];

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const product = await prisma.product.upsert({
    where: { slug: "cortes-vitalicio" },
    update: {},
    create: {
      name: "Cortes — Acesso Vitalício",
      slug: "cortes-vitalicio",
      description: "+80 mil cortes prontos pra viralizar. Pagamento único, acesso vitalício.",
      price: 14.9,
    },
  });
  console.log(`Produto: ${product.name} (${product.id})`);

  for (const [index, name] of CATEGORIES.entries()) {
    const slug = slugify(name);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, order: index },
    });

    const exampleSlug = `${slug}-exemplo-1`;
    await prisma.content.upsert({
      where: { slug: exampleSlug },
      update: {},
      create: {
        title: `${name} — Exemplo 1`,
        slug: exampleSlug,
        categoryId: category.id,
        storageKey: `dev-placeholder/${slug}/exemplo-1.mp4`,
      },
    });

    console.log(`Categoria: ${name} (${category.id})`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
