import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";

// 1. تحديد مسار قاعدة البيانات المطلق
const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const dbUrl = process.env.DATABASE_URL || `file:${dbPath}`;

// 2. إعداد الـ LibSQL Adapter المكتمل
const adapter = new PrismaLibSql({
  url: dbUrl,
});

// 3. إرسال الـ Adapter إلى PrismaClient
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@platform.com" },
    update: {
      password: hashedPassword,
    },
    create: {
      name: "Super Admin",
      email: "admin@platform.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Super Admin seeded successfully:", admin.email);
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
