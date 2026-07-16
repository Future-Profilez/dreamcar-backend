const { renderEmail, SITE, SANS, MONO, T } = require('./_emailLayout');

// user = { name }, competition = { title, slug }, winner = { name, location, image }
module.exports = (user, competition, winner = {}) => {
    const compUrl = competition?.slug ? `${SITE}/competition/${competition.slug}` : `${SITE}/winners`;

    const winnerBlock = winner?.name ? `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${T.ink};border-radius:10px;">
            <tr>
                <td style="padding:26px 24px;" align="center">
                    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${T.accent};margin-bottom:10px;">Winner</div>
                    <div style="font-family:${SANS};font-size:22px;font-weight:800;color:#ffffff;">${winner.name}</div>
                    ${winner.location ? `<div style="font-family:${SANS};font-size:13px;color:#9AA1AC;margin-top:4px;">${winner.location}</div>` : ''}
                </td>
            </tr>
        </table>
    ` : `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F6F7F9;border:1px solid ${T.line};border-radius:10px;">
            <tr>
                <td style="padding:22px 24px;" align="center">
                    <div style="font-family:${SANS};font-size:15px;color:${T.text};">The winner is being verified and will be announced shortly — stay tuned.</div>
                </td>
            </tr>
        </table>
    `;

    return renderEmail({
        preheader: `${competition?.title || 'A competition'} has ended.`,
        tag: 'Results',
        eyebrow: 'Draw closed',
        heading: `${competition?.title || 'Competition'} has ended`,
        intro: `Hi <strong>${user?.name || 'there'}</strong>, this draw is now closed. Here's where it landed:`,
        bodyHtml: winnerBlock,
        cta: { text: 'View results', href: compUrl, variant: 'ink' },
        note: `Missed this one? Fresh competitions are live now — your next entry could be the winning one.`,
    });
};
