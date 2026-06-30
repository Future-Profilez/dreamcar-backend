// Marketing email announcing a competition has ended (and winner, if available).
// Params: user = { name }, competition = { title, slug }, winner = { name, location, image }
module.exports = (user, competition, winner = {}) => {
    const compUrl = competition?.slug
        ? `${process.env.FRONTEND_URL}/competition/${competition.slug}`
        : `${process.env.FRONTEND_URL}/winners`;

    const winnerBlock = winner?.name
        ? `
            <div style="width: 50px; height: 3px; background-color: #EC6623; margin: 25px auto;"></div>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Winner</p>
            <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #111827;">${winner.name}</h2>
            ${winner.location ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">${winner.location}</p>` : ''}
        `
        : `
            <div style="width: 50px; height: 3px; background-color: #EC6623; margin: 25px auto;"></div>
            <p style="margin: 0; font-size: 15px; color: #4b5563;">The winner will be announced shortly — stay tuned!</p>
        `;

    return `
    <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 40px 0; width: 100%;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #f4f4f5; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td align="center" style="background-color: #171717; padding: 35px 20px;">
                                <img src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75" width="140" alt="Dream Cars" style="display: block;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 30px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 8px; border: 2px dashed #cbd5e1;">
                                    <tr>
                                        <td align="center" style="padding: 40px 30px;">
                                            <h1 style="margin: 0 0 15px 0; font-size: 24px; color: #111827; text-transform: uppercase; letter-spacing: 2px;">Competition Ended</h1>
                                            <div style="width: 50px; height: 3px; background-color: #EC6623; margin: 0 auto 25px auto;"></div>

                                            <p style="margin: 0 0 12px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                                                Hi <strong>${user?.name || ''}</strong>, the competition below has now closed:
                                            </p>
                                            <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #EC6623;">${competition?.title || ''}</h2>

                                            ${winnerBlock}

                                            <div style="margin-top: 30px;">
                                                <a href="${compUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; border-radius: 6px;">View Results</a>
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                                    <tr>
                                        <td align="center" style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            <span style="color: #EC6623;">✓</span> Guaranteed Draws &nbsp;&nbsp;|&nbsp;&nbsp;
                                            <span style="color: #EC6623;">✓</span> Secure Entry &nbsp;&nbsp;|&nbsp;&nbsp;
                                            <span style="color: #EC6623;">✓</span> Fixed Odds
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="background-color: #e5e7eb; padding: 25px;">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">
                                    Need help? <a href="${process.env.FRONTEND_URL}/contact" style="color: #EC6623; text-decoration: none; font-weight: 600;">Contact Support</a>
                                </p>
                                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                    © ${new Date().getFullYear()} Dream Cars. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;
};
