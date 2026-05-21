const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const Loggers = require("../utils/Logger");
const stripe = require('../utils/stripe');
const generateOTP = require("../utils/GeneratedOtp");
const sendEmail = require("../utils/EmailMailler");
const VerifyEmailTemplate = require("../emailsTemplates/VerifyEmailTemplate");
const WelcomeEmailTemplate = require("../emailsTemplates/WelcomeEmailTemplate");
const generateOtp = require("../utils/GeneratedOtp");
const ForgotPasswordTemplate = require("../emailsTemplates/ForgotPasswordTemplate");


exports.signup = catchAsync(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return errorResponse(res, "All fields are required", 200);
    }
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return errorResponse(res, "Email already registered", 200);
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = generateOTP();
    console.log("otpp ", otp);
    const otpExpiresAt =
      new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,

        otp,
        otpExpiresAt
      },
    });
    await sendEmail({
      email: user.email,
      subject: "Verify Your DreamCar Account 🔐",
      emailHtml: VerifyEmailTemplate(
        user?.name,
        user?.otp
      )
    });
    return successResponse(res, "Account created.  OTP sent to email. Please verify it to continue", 201);
  } catch (error) {
    Loggers.error(`Signup error: ${error?.stack || error?.message || String(error)}`);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return errorResponse(
      res,
      "Email and OTP are required",
      200
    );
  }

  const user =
    await prisma.user.findUnique({
      where: { email }
    });

  if (!user) {
    return errorResponse(
      res,
      "User not found",
      200
    );
  }

  // CHECK ATTEMPTS
  if (user.otpAttempts >= 5) {
    return errorResponse(
      res,
      "Too many attempts. Request new OTP.",
      200
    );
  }

  // CHECK EXPIRY
  if (
    !user.otpExpiresAt ||
    new Date() > user.otpExpiresAt
  ) {

    // CLEAR EXPIRED OTP
    await prisma.user.update({
      where: {
        id: user.id
      },

      data: {
        otp: null,
        otpExpiresAt: null
      }
    });

    return errorResponse(
      res,
      "OTP expired",
      200
    );
  }

  // WRONG OTP
  if (user.otp !== otp) {

    await prisma.user.update({
      where: {
        id: user.id
      },

      data: {
        otpAttempts: {
          increment: 1
        }
      }
    });

    return errorResponse(
      res,
      "Invalid OTP",
      200
    );
  }

  // SUCCESS
  await prisma.user.update({
    where: {
      id: user.id
    },

    data: {
      otpVerifiedAt: new Date(),
      otp: null,
      otpExpiresAt: null,
      otpAttempts: 0
    }
  });

  await sendEmail({
    email: user.email,
    subject: "Welcome to DreamCar 🚗",
    emailHtml: WelcomeEmailTemplate(
      user.name
    )
  });

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "24h",
    }
  );

  return successResponse(
    res,
    "OTP verified successfully",
    200,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }
  );
});

exports.resendOTP = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return errorResponse(
      res,
      "Email is required",
      200
    );
  }

  const user =
    await prisma.user.findUnique({
      where: { email }
    });

  if (!user) {
    return errorResponse(
      res,
      "User not found",
      200
    );
  }

  // ALREADY VERIFIED
  if (user.otpVerifiedAt) {
    return errorResponse(
      res,
      "Email already verified",
      200
    );
  }

  // GENERATE NEW OTP
  const otp = generateOTP();
  const otpExpiresAt =
    new Date(
      Date.now() + 10 * 60 * 1000
    );

  // UPDATE USER
  await prisma.user.update({
    where: {
      id: user.id
    },

    data: {
      otp,
      otpExpiresAt,
      otpAttempts: 0
    }
  });

  // SEND EMAIL
  await sendEmail({
    email: user.email,
    subject:
      "Your New DreamCar OTP 🔐",

    emailHtml:
      VerifyEmailTemplate(
        user.name,
        otp
      )
  });

  return successResponse(
    res,
    "OTP resent successfully",
    200
  );
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return errorResponse(
      res,
      "Email is required",
      200
    );
  }

  const user =
    await prisma.user.findUnique({
      where: { email }
    });

  if (!user) {
    return errorResponse(
      res,
      "No account found",
      200
    );
  }

  const otp = generateOtp();

  const otpExpiresAt =
    new Date(
      Date.now() + 10 * 60 * 1000
    );

  await prisma.user.update({
    where: {
      id: user.id
    },

    data: {
      otp,
      otpAttempts: 0,
      otpExpiresAt
    }
  });

  await sendEmail({
    email: user.email,
    subject: "Reset Your Password 🔐",
    emailHtml:
      ForgotPasswordTemplate(
        user.name,
        otp
      )
  });

  return successResponse(
    res,
    "OTP sent successfully",
    200
  );
});

exports.resetPassword = catchAsync(async (req, res) => {
  const {
    email,
    otp,
    password
  } = req.body;

  if (
    !email ||
    !otp ||
    !password
  ) {

    return errorResponse(
      res,
      "All fields are required",
      200
    );
  }

  const user =
    await prisma.user.findUnique({
      where: { email }
    });

  if (!user) {
    return errorResponse(
      res,
      "User not found",
      404
    );
  }

  // CHECK ATTEMPTS
  if (user.otpAttempts >= 5) {
    return errorResponse(
      res,
      "Too many attempts. Request new OTP.",
      200
    );
  }

  // CHECK EXPIRY
  if (
    !user.otpExpiresAt ||
    new Date() > user.otpExpiresAt
  ) {

    // CLEAR EXPIRED OTP
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        otp: null,
        otpExpiresAt: null
      }
    });

    return errorResponse(
      res,
      "OTP expired",
      200
    );
  }

  // OTP CHECK
  if (user.otp !== otp) {
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        otpAttempts: {
          increment: 1
        }
      }
    });

    return errorResponse(
      res,
      "Invalid OTP",
      200
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      id: user.id
    },

    data: {
      password: hashedPassword,

      otp: null,
      otpExpiresAt: null,
      otpAttempts: 0
    }
  });

  return successResponse(
    res,
    "Password reset successful",
    200
  );
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return errorResponse(res, "All fields are required", 200);
  }

  Loggers.info("Login attempt");
  const user = await prisma.user.findUnique({
    where: { email },
  });

  Loggers.info(`Login user found: ${user ? "yes" : "no"}`);

  if (!user) {
    return errorResponse(res, "User not found", 200);
  }

  if (user.deletedAt) {
    return errorResponse(res, "Account deleted", 200);
  }

  if (user.isBlocked === 1) {
    return errorResponse(
      res,
      "Your account has been blocked",
      200
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return errorResponse(res, "Invalid credentials", 200);
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
      otpVerifiedAt: user.otpVerifiedAt,
    },
    token,
  });
});

exports.GetUser = catchAsync(async (req, res) => {
  try {
    const id = req.user.id;

    if (!id) {
      // Loggers.error("Invalid User");
      return errorResponse(res, "Invalid User", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        otpVerifiedAt: true,
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

exports.updateProfile = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, password } = req.body;

    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      dataToUpdate.password = hashedPassword;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return errorResponse(res, "No fields to update", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        otpVerifiedAt: true,
      }
    });

    return successResponse(res, "Profile updated successfully!", 200, {
      user: updatedUser,
    });
  } catch (error) {
    Loggers.error(`UpdateProfile error: ${error?.stack || error?.message || String(error)}`);
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
    if (req.user?.role !== "admin") {
      return errorResponse(
        res,
        "Forbidden",
        200
      );
    }

    const {
      search,
      status,
      sort
    } = req.query;

    let where = {
      role: {
        not: "admin",
      }
    };
    // SEARCH
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          email: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    // STATUS
    if (status === "active") {
      where.deletedAt = null;
    } else if (status === "inactive") {
      where.deletedAt = {
        not: null
      };
    }

    // SORT
    let orderBy = {
      createdAt: "desc"
    };

    if (sort === "oldest") {
      orderBy = {
        createdAt: "asc"
      };
    } else if (sort === "tickets") {
      orderBy = {
        tickets: {
          _count: "desc"
        }
      };
    }
    const allUsers = await prisma.user.findMany({
      where,
      include: {
        tickets: true,
      },
      orderBy,
    });

    if (!allUsers || allUsers.length === 0) {
      return successResponse(
        res,
        "No users found",
        200,
        []
      );
    }
    const formattedUsers = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      tickets: user.tickets?.length || 0,
      status: user.deletedAt ? "deleted" : user.isBlocked === 1 ? "blocked" : "active",
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

exports.getWallet = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const wallet = await prisma.wallet.findUnique({
      where: {
        userId,
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!wallet) {
      return successResponse(res, "Wallet fetched successfully", 200,
        {
          balance: 0,
          transactions: [],
        });
    }

    return successResponse(res, "Wallet fetched successfully", 200, wallet);

  } catch (error) {
    console.error("Get Wallet Error:", error);

    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.createWalletPayment = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return errorResponse(res, "Valid amount is required", 200);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: req.user.email,

      line_items: [{
        price_data: {
          currency: "USD",
          product_data: {
            name: "Wallet Recharge"
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      success_url: `${process.env.FRONTEND_URL}/ticket/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/ticket/payment/cancel`,

      metadata: {
        userId,
        amount,
        currency: "USD",
        type: "wallet_recharge",
      }
    });

    return successResponse(res, "Wallet recharge session created", 200, {
      url: session.url
    });

  } catch (error) {
    console.error("Wallet recharge session create error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteAccount = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const deletedAt = new Date();
    const unusablePassword = await bcrypt.hash(`${userId}_${deletedAt.toISOString()}_${Math.random()}`, 12);

    // Soft delete user by setting deletedAt timestamp and invalidating credentials
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt,
        email: `deleted_${userId}_${deletedAt.getTime()}_${req.user.email}`,
        name: "Deleted User",
        password: unusablePassword
      }
    });

    Loggers.info(`User account deleted: ${userId}`);
    return successResponse(res, "Account deleted successfully", 200);
  } catch (error) {
    Loggers.error(`Delete account error: ${error?.stack || error?.message || String(error)}`);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.toggleBlockUser = catchAsync(async (req, res) => {
  if (req.user.role !== "admin") {
    return errorResponse(
      res,
      "Unauthorized",
      200
    );
  }

  const userId =
    parseInt(req.params.id);

  const user =
    await prisma.user.findUnique({
      where: { id: userId }
    });

  if (!user) {
    return errorResponse(
      res,
      "User not found",
      200
    );
  }

  if (user.role === "admin") {
    return errorResponse(
      res,
      "Admin cannot be blocked",
      200
    );
  }

  const updated =
    await prisma.user.update({
      where: {
        id: userId
      },

      data: {
        isBlocked:
          user.isBlocked === 1
            ? 0
            : 1,

        blockedAt:
          user.isBlocked === 0
            ? new Date()
            : null
      }
    });

  return successResponse(
    res,
    updated.isBlocked === 1
      ? "User blocked successfully"
      : "User unblocked successfully",
    200,
    updated
  );
});

// exports.deleteUserByAdmin = catchAsync(async (req, res) => {

//   if (req.user.role !== "admin") {
//     return errorResponse(
//       res,
//       "Unauthorized",
//       200
//     );
//   }

//   const userId =
//     parseInt(req.params.id);

//   const user =
//     await prisma.user.findUnique({
//       where: { id: userId }
//     });

//   if (!user) {
//     return errorResponse(
//       res,
//       "User not found",
//       200
//     );
//   }

//   if (user.role === "admin") {
//     return errorResponse(
//       res,
//       "Admin account cannot be deleted",
//       200
//     );
//   }

//   if (user.deletedAt) {
//     return errorResponse(
//       res,
//       "User already deleted",
//       200
//     );
//   }

//   await prisma.user.update({
//     where: {
//       id: userId
//     },
//     data: {
//       deletedAt: new Date()
//     }
//   });

//   return successResponse(
//     res,
//     "User deleted successfully",
//     200
//   );
// });
