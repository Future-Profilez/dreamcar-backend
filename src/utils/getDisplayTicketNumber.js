const getDisplayTicketNumber = (
  ticketCode,
  competitionId
) => {
  if (!ticketCode) return "";

  const code = String(ticketCode);
  const compId = String(competitionId);

  return Number(
    code.slice(5 + compId.length)
  ).toString();
};

module.exports = {
  getDisplayTicketNumber
};