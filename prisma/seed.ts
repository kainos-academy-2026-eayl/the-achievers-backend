import { createPrismaClient } from "../src/prismaClient";
import { seedDatabase } from "../src/seed";

const prisma = createPrismaClient();

try {
    await seedDatabase(prisma, process.env.ADMIN_PASSWORD);
} finally {
    await prisma.$disconnect();
}
