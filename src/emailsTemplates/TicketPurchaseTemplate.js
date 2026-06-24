const { getDisplayTicketNumber } = require("../utils/getDisplayTicketNumber");

module.exports = ({ user, competition, tickets, amount, instantWins = [] }) => {
    const hasInstantWin = instantWins.length > 0;
    // const ticketHtml = tickets.map(t => `<span style="display:inline-block; background:#000000; color:#ffffff; padding:8px 12px; border-radius:6px; font-size:13px; font-weight:700; letter-spacing:1px; margin-right:6px; margin-bottom:8px;">${t.ticketCode}</span>`).join('');
    const ticketHtml = tickets.map(t =>
        `<span style="display:inline-block; background:#000000; color:#ffffff; padding:8px 12px; border-radius:6px; font-size:13px; font-weight:700; letter-spacing:1px; margin-right:6px; margin-bottom:8px;">
    #${getDisplayTicketNumber(
            t.ticketCode,
            competition.id
        )}
  </span>`
    ).join('');
    let instantWinHtml = '';
    if (hasInstantWin) {
        instantWinHtml = `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4fff4; border: 1px solid #b7f3c1; border-radius: 8px; margin-bottom: 25px;">
                <tr>
                    <td style="padding: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #1f8f39; font-size: 18px;">Instant Win!</h3>
                        ${instantWins.map(win => `<p style="margin: 0; color: #444; font-size: 14px;">Ticket 
                            <strong>
                            #${getDisplayTicketNumber(
                            win.ticketCode,
                            competition.id
                           )}
                      </strong> won <strong>${win.prize?.title || 'a prize'}</strong></p>`).join('')}
                    </td>
                </tr>
            </table>
        `;
    }

    return `
    <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 40px 0; width: 100%;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-top: 5px solid #42BE38; box-shadow: 0 10px 40px rgba(0,0,0,0.06); border-left: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;">
                        <tr>
                            <td style="background-color: #171717; padding: 30px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left">
                                            <img src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75" width="110" alt="Dream Cars" style="display: block;">
                                        </td>
                                        <td align="right" style="font-size: 11px; color: #42BE38; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                                            Confirmed
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 50px 40px;">
                                <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 800; color: #111827; line-height: 1.2; text-transform: uppercase; letter-spacing: -0.5px;">
                                    You're in the Draw.
                                </h1>
                                <p style="margin: 0 0 35px 0; font-size: 15px; color: #4b5563; line-height: 1.7;">
                                    Hi <strong>${user.name}</strong>, your entry is officially locked in. Keep this receipt safe.
                                </p>

                                ${instantWinHtml}

                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #111827; padding-top: 25px; margin-bottom: 35px;">
                                    <tr>
                                        <td style="padding-bottom: 20px;">
                                            <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Amount Paid</div>
                                            <div style="font-size: 16px; color: #111827; font-weight: 700;">£${amount}</div>
                                        </td>
                                        <td style="padding-bottom: 20px;" align="right">
                                            <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Tickets</div>
                                            <div style="font-size: 20px; color: #EC6623; font-weight: 800;">${tickets.length}x</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-bottom: 20px;">
                                            <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Competition</div>
                                            <div style="font-size: 18px; color: #111827; font-weight: 700;">${competition.title}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding: 20px; background-color: #f9fafb; border-radius: 4px;">
                                            <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">Your Ticket Numbers</div>
                                            <div style="font-size: 15px; color: #111827; font-weight: 600; line-height: 1.6;">
                                                ${ticketHtml}
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left">
                                            <a href="${process.env.FRONTEND_URL}/profile" style="display: inline-block; background-color: #171717; color: #ffffff; padding: 16px 36px; text-decoration: none; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-size: 14px;">View My Tickets</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #fafafa; padding: 30px 40px; border-top: 1px solid #f0f0f0;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
                                            © ${new Date().getFullYear()} Dream Cars. All rights reserved.<br>
                                            <a href="${process.env.FRONTEND_URL}/profile" style="color: #6b7280; text-decoration: underline;">My Account</a> &nbsp;|&nbsp; <a href="${process.env.FRONTEND_URL}/contact" style="color: #6b7280; text-decoration: underline;">Support</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;
};
