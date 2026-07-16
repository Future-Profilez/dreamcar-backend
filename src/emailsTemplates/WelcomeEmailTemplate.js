const { renderEmail, SITE } = require('./_emailLayout');

module.exports = (user) => renderEmail({
    preheader: 'Your DreamCar account is live — your first draw is waiting.',
    tag: 'Welcome',
    eyebrow: "You're in",
    heading: 'Welcome to DreamCar',
    intro: `Hi <strong>${user || 'there'}</strong>, your account is verified and active. Premium cars, tech, and cash prizes — fixed odds, guaranteed draws. Pick a competition and grab your tickets.`,
    cta: { text: 'Browse competitions', href: `${SITE}/competitions`, variant: 'orange' },
});
