import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const prismaClientSingleton = () => {
  // استخدام DATABASE_URL من البيئة إن وُجد، أو السقوط على المسار المحلي
  const defaultLocalPath = path.resolve(process.cwd(), "prisma", "dev.db");
  const dbUrl = process.env.DATABASE_URL || `file:${defaultLocalPath}`;

  const adapter = new PrismaLibSql({
    url: dbUrl,
  });

  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
