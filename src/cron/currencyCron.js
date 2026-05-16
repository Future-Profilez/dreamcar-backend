const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');

async function updateCurrencyRates() {
  try {
    console.log(`Cron: Currency rates fetch started...`);
    const response = await fetch('https://open.er-api.com/v6/latest/GBP');
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.rates) {
      throw new Error('Rates payload missing');
    }

    const currencies = ['GBP', 'EUR', 'USD'];
    for (const currency of currencies) {
      const rate = data.rates[currency];
      if (typeof rate === 'number' && Number.isFinite(rate)) {
        await prisma.currencyRate.upsert({
          where: { currency },
          update: { rate },
          create: { currency, rate }
        });
        console.log(`Cron: Updated currency ${currency} with rate ${rate}`);
      }
    }

    Loggers.info('Cron: Currency rates updated successfully.');
  } catch (error) {
    const message = error?.message || String(error);
    Loggers.error(`Cron Error (CurrencyRates): ${message}`);
    console.log(`Cron Error (CurrencyRates): ${message}`);
  }
}

updateCurrencyRates();

// Run every 6 hours
cron.schedule('0 */6 * * *', updateCurrencyRates);
