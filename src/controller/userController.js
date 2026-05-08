const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const Loggers = require("../utils/Logger");

exports.signup = catchAsync(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return errorResponse(res, "All fields are required", 400);
    }
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return errorResponse(res, "Email already registered", 400);
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    return successResponse(res, "Account created successfully!", 201);
  } catch (error) {
    Loggers.error(`Signup error: ${error?.stack || error?.message || String(error)}`);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return errorResponse(res, "All fields are required", 400);
  }

  Loggers.info("Login attempt");
  const user = await prisma.user.findUnique({
    where: { email },
  });

  Loggers.info(`Login user found: ${user ? "yes" : "no"}`);

  if (!user) {
    return errorResponse(res, "User not found", 401);
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return errorResponse(res, "Invalid credentials", 401);
  }
  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
  );
  return successResponse(res, "Login successful", 200, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
});

exports.GetUser = catchAsync(async (req, res) => {
  try {
    const id = req.user.id;

    if (!id) {
      Loggers.error("Invalid User");
      return errorResponse(res, "Invalid User", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });
    if (!user) {
      Loggers.error("Invalid User");
      return errorResponse(res, "Invalid User", 401);
    }
    return successResponse(res, "User Get successfully!", 201, {
      user,
    });
  } catch (error) {
    Loggers.error(`GetUser error: ${error?.stack || error?.message || String(error)}`);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.getUserProfileDashboard = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, filter } = req.query;
    const now = new Date();

    if (!type) {
      return errorResponse(res, "Type is required", 200);
    }

    let data = null;

    if (type === "entries") {

      const tickets = await prisma.ticket.findMany({
        where: { userId },
        include: {
          competition: true
        },
        orderBy: { createdAt: "desc" }
      });

      const grouped = {};

      tickets.forEach((t) => {
        const compId = parseInt(t.competitionId);
        const isActive = new Date(t.competition.endTime) > now;

        if (filter === "active" && !isActive) return;
        if (filter === "past" && isActive) return;
        // "all" → no filter

        if (!grouped[compId]) {
          grouped[compId] = {
            competitionId: parseInt(compId),
            competitionSlug: t.competition.slug,
            title: t.competition.title,
            image: t.competition.images?.[0] || t.competition.prizeDetailImage,
            tickets: [],
            isActive,
            sold: t?.competition.soldTickets,
            total: t?.competition.totalTickets,
            drawDate: t?.competition.endTime
          };
        }

        grouped[compId].tickets.push(t.ticketCode || `#${t.ticketNumber}`);
      });

      data = Object.values(grouped);
    }
    else {
      return errorResponse(res, "Invalid type", 200);
    }

    return successResponse(res, "Data fetched successfully", 200, data);

    
  } catch (error) {
    console.error("Dashboard Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getAllUsers = catchAsync(async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: "admin",
        },
        deletedAt: null,
      },
      include: {
        tickets: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!users || users.length === 0) {
      return successResponse(res, "No users found", 200, []);
    }

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      tickets: user.tickets?.length || 0,
      status: user.deletedAt ? "inactive" : "active",
      createdAt: user.createdAt,
    }));

    return successResponse(
      res,
      "Users fetched successfully",
      200,
      formattedUsers
    );
  } catch (error) {
    console.log("Get Users Error:", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});
