const Stripe = require('stripe');

// Check for API key presence
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
