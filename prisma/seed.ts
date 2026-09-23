import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@traveleverywhere.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  await prisma.user.create({
    data: { name: "Admin", email, passwordHash },
  });

  console.log(`Created demo admin. Login with ${email} / password123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
