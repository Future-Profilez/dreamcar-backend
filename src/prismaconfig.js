// prisma.js or prismaconfig.js
const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global._prisma) {
  global._prisma = new PrismaClient();
}

prisma = global._prisma;

module.exports = prisma;