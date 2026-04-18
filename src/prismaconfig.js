const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const Loggers = require("./utils/Logger");
const { URL } = require("url");

let prisma;

const serializeError = (err) => {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const out = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    clientVersion: err.clientVersion,
    errorCode: err.errorCode,
    meta: err.meta,
  };
  try {
    return JSON.stringify(out);
  } catch {
    return String(err);
  }
};

const envSnapshot = () => {
  const snap = {
    node: process.version,
    pid: process.pid,
    cwd: process.cwd(),
    env: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasJwtSecret: Boolean(process.env.JWT_SECRET_KEY),
    port: process.env.PORT || process.env.REACT_APP_SERVER_DOMAIN,
  };

  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      snap.databaseUrl = {
        protocol: u.protocol,
        host: u.host,
        pathname: u.pathname,
      };
    } catch {
      snap.databaseUrl = { parseError: true };
    }
  }

  return snap;
};

if (!global._prisma) {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      Loggers.error(`DATABASE_URL missing. Prisma env snapshot: ${JSON.stringify(envSnapshot())}`);
      throw new Error("Missing DATABASE_URL");
    }

    if (!global._prismaPool) {
      // Configure pool specifically for Neon / pgBouncer compatibility
      global._prismaPool = new Pool({
        connectionString,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 5, // Lower max connections for serverless
        ssl: {
          rejectUnauthorized: false // Required for Neon
        }
      });
      global._prismaPool.on('error', (err) => {
        Loggers.error(`Unexpected pg pool error: ${err.message}`, err);
      });
    }

    const adapter = new PrismaPg(global._prismaPool);

    global._prisma = new PrismaClient({
      adapter,
      log: [
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ],
    });

    global._prisma.$on("warn", (e) => {
      Loggers.warn(`Prisma warn: ${typeof e === "string" ? e : JSON.stringify(e)}`);
    });

    global._prisma.$on("error", (e) => {
      Loggers.error(`Prisma error: ${typeof e === "string" ? e : JSON.stringify(e)}`);
    });
  } catch (err) {
    Loggers.error(`PrismaClient init failed: ${serializeError(err)}`);
    Loggers.error(`Prisma env snapshot: ${JSON.stringify(envSnapshot())}`);
    throw err;
  }
}

prisma = global._prisma;
module.exports = prisma;
