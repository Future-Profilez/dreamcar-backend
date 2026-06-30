const { getDisplayTicketNumber } = require("../utils/getDisplayTicketNumber");
const { renderEmail, SITE, SANS, MONO, T } = require('./_emailLayout');

module.exports = ({ user, competition, tickets, amount, instantWins = [] }) => {
    const hasInstantWin = instantWins.length > 0;

    const ticketChips = tickets.map(t =>
        `<span style="display:inline-block;background:${T.ink};color:#ffffff;font-family:${MONO};font-size:13px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:5px;margin:0 6px 8px 0;">#${getDisplayTicketNumber(t.ticketCode, competition.id)}</span>`
    ).join('');

    const instantWinHtml = hasInstantWin ? `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${T.greenSoft};border:1px solid #BBE6C7;border-radius:10px;margin-bottom:22px;">
            <tr>
                <td style="padding:20px 22px;">
                    <div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${T.green};font-weight:700;margin-bottom:8px;">Instant win!</div>
                    ${instantWins.map(win => `<div style="font-family:${SANS};font-size:14px;color:${T.text};line-height:1.6;">Ticket <strong style="font-family:${MONO};">#${getDisplayTicketNumber(win.ticketCode, competition.id)}</strong> won <strong>${win.prize?.title || 'a prize'}</strong></div>`).join('')}
                </td>
            </tr>
        </table>
    ` : '';

    const receipt = `
        ${instantWinHtml}
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${T.line};border-radius:10px;">
            <tr>
                <td style="padding:20px 22px;border-bottom:1px solid ${T.line};">
                    <div style="font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${T.faint};">Competition</div>
                    <div style="font-family:${SANS};font-size:17px;font-weight:700;color:${T.ink};margin-top:4px;">${competition.title}</div>
                </td>
            </tr>
            <tr>
                <td style="padding:20px 22px;border-bottom:1px solid ${T.line};">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="left">
                                <div style="font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${T.faint};">Amount paid</div>
                                <div style="font-family:${MONO};font-size:18px;font-weight:700;color:${T.ink};margin-top:4px;">£${amount}</div>
                            </td>
                            <td align="right">
                                <div style="font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${T.faint};">Tickets</div>
                                <div style="font-family:${MONO};font-size:18px;font-weight:700;color:${T.accent};margin-top:4px;">${tickets.length}&times;</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:20px 22px;background:#F6F7F9;border-radius:0 0 10px 10px;">
                    <div style="font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${T.faint};margin-bottom:12px;">Your ticket numbers</div>
                    <div>${ticketChips}</div>
                </td>
            </tr>
        </table>
    `;

    return renderEmail({
        preheader: `Confirmed — ${tickets.length} ticket(s) for ${competition.title}.`,
        tag: 'Receipt',
        eyebrow: 'Entry confirmed',
        heading: "You're in the draw",
        intro: `Hi <strong>${user.name}</strong>, your entry is locked in. Keep this receipt — your ticket numbers are below.`,
        bodyHtml: receipt,
        cta: { text: 'View my tickets', href: `${SITE}/profile`, variant: 'ink' },
    });
};
