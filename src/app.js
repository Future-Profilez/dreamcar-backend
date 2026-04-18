const dotenv = require("dotenv");
dotenv.config();

const prisma = require("./prismaconfig");
const express = require("express");
const app = express();
const cors = require("cors");

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
    msg: "Hello DreamCar 2",
    status: 200, 
    last_updated_at: readable,
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

const server = app.listen(PORT, () => console.log("Server is running at port : " + PORT));
server.timeout = 360000;