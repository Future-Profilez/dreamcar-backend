const axios = require("axios");

async function verifyTurnstile(token, ip) {
  if (!token) {
    return { success: false, error: "missing-token" };
  }
  try {
    const res = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: process.env.CF_TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip || ""
      })
    );
    // Always return a normalized shape. Callers must check `.success`;
    // Cloudflare returns success:false for invalid/expired tokens.
    return { success: Boolean(res.data?.success), ...res.data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = verifyTurnstile;