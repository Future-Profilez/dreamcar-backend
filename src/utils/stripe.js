const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;

// Check for API key presence
if (!stripeKey) {
  console.warn('⚠️  Warning: Missing STRIPE_SECRET_KEY in environment variables. Stripe features will fail.');
}

const stripe = new Stripe(stripeKey || 'sk_test_dummy');

module.exports = stripe;
