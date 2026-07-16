const { renderEmail, codeBlock, SANS, T } = require('./_emailLayout');

module.exports = (user, otp) => renderEmail({
    preheader: `Your DreamCar verification code is ${otp}`,
    tag: 'Verify',
    eyebrow: 'Activate account',
    heading: 'Confirm your email',
    intro: `Hi <strong>${user || 'there'}</strong>, you're one step away. Enter the code below to activate your DreamCar account.`,
    bodyHtml: `
        ${codeBlock('Verification code', otp)}
        <p style="margin:18px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${T.mute};">This code expires shortly. Didn't try to sign up? Ignore this email.</p>
    `,
});
