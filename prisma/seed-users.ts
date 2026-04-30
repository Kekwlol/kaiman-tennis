import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const tenants = await db.tenant.findMany();

  for (const tenant of tenants) {
    // Admin-User: admin@<slug>.demo
    const adminEmail = `admin@${tenant.slug}.demo`;
    const passwordHash = await bcrypt.hash("kaiman-demo-2026", 10);
    const existing = await db.user.findFirst({
      where: { tenantId: tenant.id, email: adminEmail },
    });
    if (existing) {
      console.log(`  ⏭️  ${adminEmail} existiert schon`);
      continue;
    }
    await db.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        name: `${tenant.name} Admin`,
        role: "tenantAdmin",
        passwordHash,
      },
    });
    console.log(`  ✓ Admin angelegt: ${adminEmail} (PW: kaiman-demo-2026)`);
  }
  console.log("\nFuer Mitglieder Magic-Link:");
  const members = await db.member.findMany({ take: 10, include: { tenant: true } });
  for (const m of members) {
    const exists = await db.user.findFirst({
      where: { tenantId: m.tenantId, email: m.email },
    });
    if (!exists) {
      await db.user.create({
        data: {
          tenantId: m.tenantId,
          email: m.email,
          name: m.name,
          role: "member",
          memberId: m.id,
        },
      });
      console.log(`  ✓ Member-User: ${m.email} (${m.tenant.name})`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
