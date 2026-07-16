const { renderEmail, SITE, SANS, T } = require('./_emailLayout');

// user = { name }, updates = [{ title, message }]
module.exports = (user, updates = []) => {
    const rows = updates.map(u => `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
            <tr>
                <td width="4" style="background:${T.accent};border-radius:4px;">&nbsp;</td>
                <td style="padding:14px 18px;background:#F6F7F9;border-radius:0 8px 8px 0;">
                    <div style="font-family:${SANS};font-size:15px;font-weight:700;color:${T.ink};">${u.title}</div>
                    <div style="font-family:${SANS};font-size:14px;color:${T.text};margin-top:3px;line-height:1.5;">${u.message}</div>
                </td>
            </tr>
        </table>
    `).join('');

    return renderEmail({
        preheader: 'New competitions and ending-soon alerts from DreamCar.',
        tag: 'Alert',
        eyebrow: 'Competition updates',
        heading: 'Updates on your draws',
        intro: `Hi <strong>${user?.name || 'there'}</strong>, here's what's moving right now — jump in before these close.`,
        bodyHtml: rows,
        cta: { text: 'View competitions', href: `${SITE}/competitions`, variant: 'orange' },
    });
};
