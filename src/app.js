const dotenv = require("dotenv");
dotenv.config();
var morgan = require('morgan')
const prisma = require("./prismaconfig");
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const Loggers = require("./utils/Logger");

const serializeError = (err) => {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.stack || err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "2000mb" }));
app.use(express.urlencoded({ extended: true, limit: "2000mb" }));
const PORT = process.env.PORT || process.env.REACT_APP_SERVER_DOMAIN || 5003;
app.use("/api", require("./routes/userRoutes"));
app.use("/api", require("./routes/competitionRoutes"));

// Global Error Handler
app.use((err, req, res, next) => {
  const errDetails = {
    message: err.message,
    code: err.code,
    meta: err.meta,
    name: err.name
  };
  Loggers.error(`Global Error Handler: ${req.method} ${req.url} ${JSON.stringify(errDetails)}`);
  console.error("Global Error Handler full stack:", err);
  res.status(err.statusCode || 500).json({
    status: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

let current_time = new Date();
let readable = current_time.toLocaleString('en-IN', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric'
}); 
app.get("/", (req, res) => {
  res.json({
    msg: "Hello DreamCar 3",
    status: 200, 
    last_updated_at: readable, 
  });
}); 

const startDB = async () => {
  try {
    // Attempt standard connection instead of queryRaw for adapter compatibility
    await prisma.$connect();
    Loggers.info("DB connected successfully");
  } catch (error) {
    Loggers.error(`DB connection failed: ${serializeError(error)}`);
    process.exit(1);
  }
};
startDB();


process.on("uncaughtException", (err) => {
  Loggers.error(`Uncaught Exception: ${serializeError(err)}`);
});

process.on("unhandledRejection", (reason) => {
  Loggers.error(`Unhandled Rejection: ${serializeError(reason)}`);
});

Loggers.info(`Boot: node=${process.version} pid=${process.pid} cwd=${process.cwd()} env=${process.env.NODE_ENV || "unknown"} port=${PORT}`);
const server = app.listen(PORT, () => Loggers.info(`Server listening at http://localhost:${PORT}`));
server.timeout = 360000;
