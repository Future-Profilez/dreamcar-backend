const jwt = require('jsonwebtoken');
const prisma = require('../prismaconfig');
const Loggers = require('./Logger');

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Your session has expired. Please sign in again.'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        deletedAt: true,
        isBlocked: true
      }
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({
        status: false,
        message: 'Account deleted or invalid'
      });
    }
    if (user.isBlocked === 1) {
      return res.status(401).json({
        status: false,
        message: "Account blocked"
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    // Log the real reason (TokenExpiredError / JsonWebTokenError / etc.) so JWT
    // failures are debuggable; the client still gets a generic 401.
    Loggers.warn(`Token verify failed: ${error.name} - ${error.message}`);
    return res.status(401).json({
      status: false,
      message: 'Your session has expired. Please sign in again.'
    });
  }
};
exports.checkIsAdminHasCapablity = async (req, res, next) => {
  try {
    const user = req?.user || null
    if (user?.role == 'admin') {
      return res.status(200).json({
        status: false,
        message: "You can't buy ticket or giftcards from admin account. Please login with a user account."
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: 'Your session has expired. Please sign in again.'
    });
  }
};

exports.requireAdmin = async (req, res, next) => {
  try {
    const user = req?.user || null;
    if (user?.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Unauthorized"
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Your session has expired. Please sign in again."
    });
  }
};
