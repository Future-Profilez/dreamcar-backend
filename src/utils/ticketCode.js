const crypto = require("crypto");

const randomLetters = (length) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";

  while (out.length < length) {
    const buf = crypto.randomBytes(Math.max(8, length));
    for (let i = 0; i < buf.length && out.length < length; i++) {
      out += letters[buf[i] % letters.length];
    }
  }

  return out;
};

const getPaddingWidth = (ticketNumber, totalTickets) => {
  const totalLen =
    totalTickets !== undefined && totalTickets !== null
      ? String(totalTickets).length
      : 0;
  const numLen = String(ticketNumber).length;
  return Math.max(3, totalLen, numLen);
};

const generateTicketCode = (
  competitionId,
  ticketNumber,
  totalTickets,
  randomLength = 5
) => {
  const randomStr = randomLetters(randomLength);
  const padded = String(ticketNumber).padStart(
    getPaddingWidth(ticketNumber, totalTickets),
    "0"
  );
  return `${randomStr}${competitionId}${padded}`;
};

module.exports = {
  generateTicketCode
};
