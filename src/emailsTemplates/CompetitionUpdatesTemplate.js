const CompetitionUpdatesTemplate = (newCompetitions, endingCompetitions) => {
  const baseUrl = (process.env.FRONTEND_URL || process.env.DOMAIN || "").replace(/\/$/, "");
  const backendBaseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.DOMAIN || "").replace(/\/$/, "");
  const logoBaseUrl = (process.env.ASSET_BASE_URL || process.env.FRONTEND_URL || process.env.DOMAIN || "").replace(/\/$/, "");
  const logoUrl = logoBaseUrl ? `${logoBaseUrl}/img/logoDC.png` : "";

  const renderCompetitions = (competitions, title) => {
    if (!competitions || competitions.length === 0) return '';

    const items = competitions.map(comp => `
      <div style="margin-bottom: 24px; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff;">
        <img src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75" alt="${comp.title}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">${comp.title}</h3>
          <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">Ticket Price: <strong style="color: #EC6623;">£${comp.ticketPrice}</strong></p>
          <a href="${baseUrl ? `${baseUrl}/competition/${comp.slug}` : `/competition/${comp.slug}`}" style="display: inline-block; background: #EC6623; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px;">Enter Now</a>
        </div>
      </div>
    `).join('');

    return `
      <div style="margin-bottom: 40px;">
        <h2 style="color: #333; border-bottom: 2px solid #EC6623; padding-bottom: 8px; display: inline-block; margin-bottom: 24px;">${title}</h2>
        ${items}
      </div>
    `;
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 20px;">
      <div style="background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <div style="text-align: center; margin-bottom: 32px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="DreamCar" style="width: 200px; max-width: 100%; margin-bottom: 18px; object-fit: contain;" />` : ""}
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">DreamCar Updates 🏎️</h1>
          <p style="color: #666; margin-top: 8px; font-size: 15px;">Here's what's happening today!</p>
        </div>

        ${renderCompetitions(newCompetitions, "🚀 Just Launched")}
        
        ${renderCompetitions(endingCompetitions, "⏳ Ending Very Soon")}

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 13px; line-height: 1.5;">
            You are receiving this email because you are subscribed to DreamCar updates.<br/>
            You can manage your email preferences in your account settings.
          </p>
        </div>

      </div>
    </div>
  `;
};

module.exports = CompetitionUpdatesTemplate;
