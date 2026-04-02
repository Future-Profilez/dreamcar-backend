const catchAsync = require("./catchAsync");
const Currency = require("../model/Currency");
const logger = require("./Logger");
const getRateMiddleware = catchAsync(async (req, res, next) => {
  try {
    const { currency, AdminCurrencyCode } = req.body;

    const data = await Currency.findOne({ currency: currency });
    const admincurrency = await Currency.findOne({ currency: AdminCurrencyCode });

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "Invalid currency name!",
        data: null,
      });
    }
    req.user_currency_rate = data.rate;
    req.adminCurrencyRate = admincurrency.rate;
    next();
  } catch (error) {
    console.error("Error retrieving currency rate:", error);
    logger.error("Error retrieving currency rate:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving the currency rate.",
      error: error.message,
    });
  }
});

module.exports = getRateMiddleware;
