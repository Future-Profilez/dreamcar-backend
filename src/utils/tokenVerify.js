const jwt = require('jsonwebtoken');
const prisma = require('../prismaconfig');

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Token missing or invalid'
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
        deletedAt: true
      }
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({
        status: false,
        message: 'Account deleted or invalid'
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
    return res.status(401).json({
      status: false,
      message: 'Invalid or expired token'
    });
  }
};
