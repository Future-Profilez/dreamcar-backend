// Shared email design system for all DreamCar templates.
// Email-safe: full HTML document, table layout, inline CSS only.
// Signature device: a "ticket perforation" divider + monospace data type.

const T = {
    ink: '#0B0B0F',
    page: '#ECEEF1',
    card: '#FFFFFF',
    accent: '#EC6623',
    accentDark: '#C24F18',
    green: '#16A34A',
    greenSoft: '#EAF7EE',
    text: '#1F2430',
    mute: '#6B7280',
    faint: '#9AA1AC',
    line: '#E3E6EA',
};

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";

const LOGO = 'https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75';
const SITE = process.env.FRONTEND_URL || '';

// The ticket-perforation divider: dashed tear line with two side notches
// cut out in the page colour. Reads as a tear-off entry stub.
function perforation() {
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td width="22" style="padding:0;">
                <div style="width:22px;height:22px;background:${T.page};border-radius:0 22px 22px 0;"></div>
            </td>
            <td style="padding:0;border-top:2px dashed ${T.line};font-size:0;line-height:0;">&nbsp;</td>
            <td width="22" style="padding:0;" align="right">
                <div style="width:22px;height:22px;background:${T.page};border-radius:22px 0 0 22px;"></div>
            </td>
        </tr>
    </table>`;
}

// Bulletproof-ish button. variant: 'ink' (default) | 'orange'.
function button({ text, href, variant = 'ink' }) {
    if (!text || !href) return '';
    const bg = variant === 'orange' ? T.accent : T.ink;
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td bgcolor="${bg}" style="border-radius:6px;">
                <a href="${href}" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:6px;">${text}</a>
            </td>
        </tr>
    </table>`;
}

// Big monospace code block — used for OTP / verification codes.
function codeBlock(label, code) {
    return `
    <div style="margin:8px 0 4px;">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${T.faint};margin-bottom:10px;">${label}</div>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td style="background:#F6F7F9;border:1px solid ${T.line};border-left:3px solid ${T.accent};border-radius:6px;padding:18px 26px;">
                    <span style="font-family:${MONO};font-size:34px;font-weight:700;letter-spacing:10px;color:${T.ink};">${code}</span>
                </td>
            </tr>
        </table>
    </div>`;
}

// Page shell. Slots:
//  preheader  - hidden inbox preview text
//  tag        - header-right mono label (e.g. 'RECEIPT')
//  eyebrow    - small accent kicker above the heading
//  heading    - display headline
//  intro      - lead paragraph (html allowed)
//  bodyHtml   - main content block
//  cta        - { text, href, variant }
//  note       - small muted line below the body (html allowed)
function renderEmail({ preheader = '', tag = '', eyebrow = '', heading = '', intro = '', bodyHtml = '', cta = null, note = '' }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>DreamCar</title>
</head>
<body style="margin:0;padding:0;background:${T.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${T.page};font-size:1px;line-height:1px;">${preheader}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${T.page};">
    <tr>
        <td align="center" style="padding:36px 16px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background:${T.card};border:1px solid ${T.line};border-radius:10px;overflow:hidden;">

                <!-- pit-board header -->
                <tr>
                    <td style="background:${T.ink};padding:22px 32px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="left" valign="middle">
                                    <img src="${LOGO}" width="118" alt="DreamCar" style="display:block;border:0;">
                                </td>
                                <td align="right" valign="middle" style="font-family:${MONO};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#7C828C;">
                                    ${tag || '&nbsp;'}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- message -->
                <tr>
                    <td style="padding:42px 36px 26px;">
                        ${eyebrow ? `<div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${T.accent};margin-bottom:14px;">${eyebrow}</div>` : ''}
                        ${heading ? `<h1 style="margin:0;font-family:${DISPLAY};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-0.8px;color:${T.ink};">${heading}</h1>` : ''}
                        ${intro ? `<p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.7;color:${T.text};">${intro}</p>` : ''}
                    </td>
                </tr>

                <!-- perforation -->
                <tr><td style="padding:0 0 4px;">${perforation()}</td></tr>

                <!-- body + action -->
                <tr>
                    <td style="padding:26px 36px 40px;">
                        ${bodyHtml || ''}
                        ${cta ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding-top:${bodyHtml ? '26px' : '4px'};">${button(cta)}</td></tr></table>` : ''}
                        ${note ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${T.mute};">${note}</p>` : ''}
                    </td>
                </tr>

                <!-- trust strip -->
                <tr>
                    <td style="padding:0 36px;">
                        <div style="border-top:1px solid ${T.line};padding:18px 0;font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${T.faint};">
                            Guaranteed Draws &nbsp;·&nbsp; Secure Entry &nbsp;·&nbsp; Fixed Odds
                        </div>
                    </td>
                </tr>

                <!-- footer -->
                <tr>
                    <td style="background:#F6F7F9;border-top:1px solid ${T.line};padding:24px 36px;">
                        <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;color:${T.mute};">
                            <a href="${SITE}/profile" style="color:${T.mute};text-decoration:underline;">My account</a> &nbsp;·&nbsp;
                            <a href="${SITE}/contact" style="color:${T.mute};text-decoration:underline;">Support</a>
                        </p>
                        <p style="margin:0;font-family:${SANS};font-size:12px;color:${T.faint};">© ${new Date().getFullYear()} DreamCar. All rights reserved.</p>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
</body>
</html>`;
}

module.exports = { renderEmail, perforation, button, codeBlock, T, SANS, DISPLAY, MONO, SITE };
