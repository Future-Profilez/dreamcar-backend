const axios = require("axios");

async function verifyTurnstile(token, ip) {
  const res = await axios.post(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    new URLSearchParams({
      secret: process.env.CF_TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip || ""
    })
  );
  return res.data;
}

module.exports = verifyTurnstile;