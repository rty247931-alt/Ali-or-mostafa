// Usage (values come from the environment so they never land in shell history files or git):
//   OWNER_NAME="..." OWNER_EMAIL="..." OWNER_PASSWORD="..." npm run owner:create
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/hash";

const db = new PrismaClient();

async function main() {
  const { OWNER_NAME: name, OWNER_EMAIL: rawEmail, OWNER_PASSWORD: password } = process.env;
  if (!name || !rawEmail || !password) throw new Error("Set OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD.");
  if (password.length < 12) throw new Error("OWNER_PASSWORD must be at least 12 characters.");
  const email = rawEmail.trim().toLowerCase();

  const role = await db.role.findUnique({ where: { name: "OWNER" } });
  if (!role) throw new Error("Run `npm run db:seed` first (it creates the roles).");
  const already = await db.userRole.findFirst({ where: { roleId: role.id } });
  if (already) throw new Error("An owner already exists. Manage staff from the admin panel.");

  const user = await db.user.create({
    data: { kind: "STAFF", email, fullName: name, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
  await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  console.log(`Owner created: ${email}`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => db.$disconnect());
