import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Export prisma client to use in other files
export { prisma };
