const { renderEmail, codeBlock, SANS, T } = require('./_emailLayout');

module.exports = (user, otp) => renderEmail({
    preheader: `Your DreamCar password reset code is ${otp}`,
    tag: 'Security',
    eyebrow: 'Password reset',
    heading: 'Reset your password',
    intro: `Hi <strong>${user || 'there'}</strong>, we received a request to reset your password. Use the code below to set a new one.`,
    bodyHtml: `
        ${codeBlock('Reset code', otp)}
        <p style="margin:18px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${T.mute};">If you didn't request this, you can safely ignore this email — your password stays the same.</p>
    `,
});
