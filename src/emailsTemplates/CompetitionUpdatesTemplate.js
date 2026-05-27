const CompetitionUpdatesTemplate = (
  newCompetitions,
  endingCompetitions
) => {

  const baseUrl =
    (process.env.FRONTEND_URL ||
      process.env.DOMAIN ||
      "").replace(/\/$/, "");

  const renderCompetitions = (
    competitions,
    title
  ) => {

    if (!competitions || competitions.length === 0) {
      return "";
    }

    const items = competitions.map(comp => `

      <div style="
          background:#fafafa;
          border:1px solid #eeeeee;
          border-radius:16px;
          padding:24px;
          margin-bottom:20px;
      ">

          <h3 style="
              margin-top:0;
              margin-bottom:14px;
              color:#111111;
              font-size:22px;
              line-height:1.5;
          ">
              ${comp.title}
          </h3>

          <p style="
              margin:0 0 18px;
              color:#666666;
              font-size:15px;
              line-height:1.7;
          ">
              Ticket Price:
              <strong style="color:#EC6623;">
                  £${comp.ticketPrice}
              </strong>
          </p>

          <a
              href="${baseUrl}/competition/${comp.slug}"
              style="
                  display:inline-block;
                  background:#EC6623;
                  color:#ffffff;
                  text-decoration:none;
                  padding:12px 20px;
                  border-radius:8px;
                  font-size:14px;
                  font-weight:700;
              "
          >
              Enter Competition
          </a>

      </div>

    `).join("");

    return `

      <div style="margin-bottom:40px;">

          <h2 style="
              color:#111111;
              font-size:24px;
              margin-top:0;
              margin-bottom:24px;
          ">
              ${title}
          </h2>

          ${items}

      </div>

    `;

  };

  return `

    <div style="
        font-family: Arial, sans-serif;
        max-width: 650px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 18px;
        overflow: hidden;
    ">

        <!-- HEADER -->
        <div style="
            background:#000000;
            padding:40px 30px;
            text-align:center;
        ">

            <img 
                src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75"
                alt="DreamCar Logo"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                font-size:32px;
                margin:0;
                font-weight:700;
            ">
                DreamCar Updates 🏎️
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                Latest competitions and exciting updates from DreamCar.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            ${renderCompetitions(
              newCompetitions,
              "🚀 Just Launched"
            )}

            ${renderCompetitions(
              endingCompetitions,
              "⏳ Ending Very Soon"
            )}

            <p style="
                color:#666666;
                font-size:14px;
                line-height:1.8;
                margin-bottom:0;
            ">
                You are receiving this email because you subscribed to DreamCar updates.
                You can manage your email preferences anytime from your account settings.
            </p>

        </div>

        <!-- FOOTER -->
        <div style="
            border-top:1px solid #eeeeee;
            padding:24px;
            text-align:center;
            background:#fafafa;
        ">

            <p style="
                margin:0;
                color:#888888;
                font-size:13px;
                line-height:1.8;
            ">
                Dream big. Win bigger. 🚗 <br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

  `;

};

module.exports = CompetitionUpdatesTemplate;

