const { renderEmail, SITE, SANS, MONO, T } = require('./_emailLayout');

// Called as WeeklyCompetitionTemplate({ competitions }) from the newsletter cron.
module.exports = ({ competitions = [], user } = {}) => {
    const rows = competitions.map(comp => `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border:1px solid ${T.line};border-radius:8px;">
            <tr>
                <td style="padding:18px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="left" valign="middle">
                                <div style="font-family:${SANS};font-size:16px;font-weight:700;color:${T.ink};line-height:1.3;">${comp.title}</div>
                                <div style="font-family:${MONO};font-size:12px;color:${T.mute};margin-top:4px;">£${comp.ticketPrice} / ticket</div>
                            </td>
                            <td align="right" valign="middle">
                                <a href="${SITE}/competition/${comp.slug}" style="font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.accent};text-decoration:none;white-space:nowrap;">Enter &rarr;</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `).join('');

    return renderEmail({
        preheader: 'This week\'s featured DreamCar draws are live.',
        tag: 'This week',
        eyebrow: 'Weekly draws',
        heading: "This week's competitions",
        intro: `Hi <strong>${user || 'there'}</strong>, here are the draws everyone's entering right now. Don't miss your shot.`,
        bodyHtml: rows,
        cta: { text: 'View all draws', href: `${SITE}/competitions`, variant: 'ink' },
    });
};
