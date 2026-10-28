require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const users = [
  {
    name: "Alex",
    email: process.env.SEED_ALEX_EMAIL || "alex@cubito.local",
    assigneeKey: "ALEX",
  },
  {
    name: "Sandra",
    email: process.env.SEED_SANDRA_EMAIL || "sandra@cubito.local",
    assigneeKey: "SANDRA",
  },
];

async function main() {
  const password = process.env.SEED_PASSWORD;

  if (!password || password.length < 10) {
    throw new Error(
      "Define SEED_PASSWORD (mínimo 10 caracteres) antes de ejecutar el seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  for (const user of users) {
    const email = user.email.toLowerCase().trim();

    await prisma.user.upsert({
      where: { email },
      update: {
        name: user.name,
        passwordHash,
        assigneeKey: user.assigneeKey,
      },
      create: {
        name: user.name,
        email,
        passwordHash,
        assigneeKey: user.assigneeKey,
      },
    });

    console.log(`✓ Usuario listo: ${user.name} <${email}>`);
  }

  console.log("\nSeed completado. Cambia la contraseña en producción.");
}

main()
  .catch((error) => {
    console.error("Error en el seed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
