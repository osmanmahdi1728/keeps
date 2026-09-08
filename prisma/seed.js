const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "owner@keeps.local";
  const passwordHash = await bcrypt.hash("keeps-demo", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Demo owner" },
    create: { email, name: "Demo owner", passwordHash },
  });

  const merchant = await prisma.merchant.upsert({
    where: { userId: user.id },
    update: { name: "Demo Cafe", slug: "demo-cafe" },
    create: {
      userId: user.id,
      name: "Demo Cafe",
      slug: "demo-cafe",
      primaryColor: "#1c1914",
      backgroundColor: "#f4efe6",
      accentColor: "#c45c26",
    },
  });

  await prisma.program.upsert({
    where: { merchantId: merchant.id },
    update: { stampsRequired: 10, rewardLabel: "Free coffee" },
    create: {
      merchantId: merchant.id,
      stampsRequired: 10,
      rewardLabel: "Free coffee",
      description: "Buy nine coffees, the tenth is on us.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
