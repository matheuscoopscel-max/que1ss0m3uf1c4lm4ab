import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { prisma } from "../src/lib/database/prisma";
import { hashPassword } from "../src/lib/auth/password";

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }

  // node:readline não suporta input mascarado nativamente; aceitável pra
  // um script rodado localmente/manualmente (não em CI, não logado).
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  console.log("=== Criar usuário ADMIN ===\n");

  const name = await prompt("Nome: ");
  const email = await prompt("Email: ");
  const password = await prompt("Senha (mín. 8 caracteres): ", true);

  if (!name || !email || password.length < 8) {
    console.error("\nDados inválidos: nome/email obrigatórios, senha com 8+ caracteres.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`\nJá existe um usuário com o email ${email}.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });

  console.log(`\nAdmin criado: ${admin.email} (id ${admin.id})`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
