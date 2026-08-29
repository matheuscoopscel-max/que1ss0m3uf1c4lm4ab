import "server-only";
import { prisma } from "@/lib/database/prisma";

export async function getSetting(key: string, fallback: string | null = null): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSettings(keys: string[]): Promise<Record<string, string | null>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(keys.map((key) => [key, map.get(key) ?? null]));
}
