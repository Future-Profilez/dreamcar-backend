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

const PORT = process.env.PORT || process.env.REACT_APP_SERVER_DOMAIN || 8080;

app.use("/api", require("./routes/userRoutes"));
app.use("/api", require("./routes/competitionRoutes"));

app.get("/", (req, res) => {
  res.json({
    msg: "Hello World",
    status: 200,
  });
});

const startDB = async () => {
  try {
    await prisma.$connect();
    console.log("✅ DB connected successfully");
  } catch (error) {
    console.error("❌ DB connection failed:", error);
    process.exit(1);
  }
};
startDB();


process.on("uncaughtException", (err) => {
  Loggers.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
});

const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;