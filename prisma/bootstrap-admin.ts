import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  const name = process.env.BOOTSTRAP_ADMIN_NAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const organizationId = process.env.BOOTSTRAP_ORGANIZATION_ID?.trim();
  if (!email || !name || !password || password.length < 12) throw new Error("BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and a 12+ character BOOTSTRAP_ADMIN_PASSWORD are required");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) { console.log(`Bootstrap administrator already exists: ${email}`); return; }
  const contractorCount = await db.organization.count({ where: { partyType: "CONTRACTOR" } });
  if (!organizationId && contractorCount > 1) throw new Error("BOOTSTRAP_ORGANIZATION_ID is required when multiple contractor organizations exist");
  const organization = organizationId
    ? await db.organization.findFirst({ where: { id: organizationId, partyType: "CONTRACTOR" } })
    : await db.organization.findFirst({ where: { partyType: "CONTRACTOR" }, orderBy: { createdAt: "asc" } });
  if (!organization) throw new Error("Create the contractor organization before bootstrapping ADMIN");
  await db.user.create({ data: { organizationId: organization.id, fullName: name, email, passwordHash: await bcrypt.hash(password, 10), jobTitle: "IT Administrator", role: "ADMIN", mustChangePassword: true } });
  console.log(`Created bootstrap administrator: ${email}`);
}
main().finally(() => db.$disconnect());
