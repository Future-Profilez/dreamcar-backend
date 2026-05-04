const generateTicketCode = (competitionId, number) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const randomStr = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("");

  const padded = String(number).padStart(3, "0");

  return `T${competitionId}${randomStr}${padded}`;
};

module.exports = {
  generateTicketCode
};