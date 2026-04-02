const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

let prisma;

if (!global._prisma) {
    global._prisma = new PrismaClient({adapter});
}

prisma = global._prisma;
module.exports = prisma;