const prisma = require("../prismaconfig");

function generateGiftCode() {
  return (
    "DRM-" +
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

exports.processGiftCreditPayment = async (session) => {
  const userId = Number(session.metadata.userId);

  const amount = Number(session.metadata.amount);

  await prisma.giftCredit.create({
    data: {
      code: generateGiftCode(),

      amount,

      purchasedById: userId,

      expiresAt: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ),
    },
  });
};