const { renderEmail, SITE, SANS, T } = require('./_emailLayout');

module.exports = (email) => renderEmail({
    preheader: "You're subscribed — new competitions and instant wins, straight to your inbox.",
    tag: 'Subscribed',
    eyebrow: 'Newsletter',
    heading: "You're on the list",
    intro: `Thanks for subscribing with <strong>${email}</strong>. You'll get new competition drops, ending-soon alerts, and exclusive offers first.`,
    cta: { text: 'Explore competitions', href: `${SITE}/competitions`, variant: 'orange' },
    note: `Subscribed by mistake? You can unsubscribe any time from the link in our emails.`,
});
