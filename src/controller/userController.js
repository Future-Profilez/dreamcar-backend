const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const { options } = require("../routes/userRoutes");

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
    console.log("Signup error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.login = catchAsync(async (req, res) => {
    console.log("req")
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, "All fields are required", 400);
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return errorResponse(res, "User not found", 200);
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
    console.log(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
