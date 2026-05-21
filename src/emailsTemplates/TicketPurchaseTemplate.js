
module.exports = ({
    user,
    competition,
    tickets,
    amount,
    instantWins = []
}) => {

    const hasInstantWin =
        instantWins.length > 0;

    return `
    
    <div style="
        font-family: Arial, sans-serif;
        max-width: 650px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid #f0f0f0;
        box-shadow: 0 4px 30px rgba(0,0,0,0.06);
    ">

        <!-- HEADER -->
        <div style="
            background: #000;
            padding: 40px 30px;
            text-align: center;
        ">
            <img 
                src="${process.env.LIVE_URL}/img/logoDC.png"
                alt="DreamCar"
                style="
                    width: 220px;
                    max-width: 100%;
                    margin-bottom: 20px;
                "
            />

            <h1 style="
                color: #fff;
                margin: 0;
                font-size: 30px;
                font-weight: 700;
            ">
                Purchase Confirmed 🎉
            </h1>

            <p style="
                color: rgba(255,255,255,0.7);
                margin-top: 12px;
                font-size: 15px;
            ">
                Your competition entries are officially booked.
            </p>
        </div>

        <!-- BODY -->
        <div style="padding: 40px 30px;">

            <p style="
                font-size: 16px;
                color: #444;
                line-height: 1.7;
            ">
                Hi <strong>${user.name}</strong>,
            </p>

            <p style="
                font-size: 16px;
                color: #444;
                line-height: 1.7;
            ">
                Thank you for entering 
                <strong>${competition.title}</strong>.
            </p>

            <!-- COMPETITION -->
            <div style="
                background: #fafafa;
                border-radius: 16px;
                overflow: hidden;
                margin: 30px 0;
                border: 1px solid #eee;
            ">

                <img
    src="${competition.images?.[0]?.startsWith("http")
            ? competition.images[0]
            : `${process.env.LIVE_URL}${competition.images?.[0]}`
        }"
    alt="${competition.title}"
    style="
        width: 100%;
        max-height: 260px;
        display: block;
    "
/>

                <div style="padding: 24px;">

                    <h2 style="
                        margin: 0 0 12px;
                        color: #111;
                        font-size: 24px;
                    ">
                        ${competition.title}
                    </h2>

                    <p style="
                        margin: 0;
                        color: #666;
                        line-height: 1.7;
                        font-size: 15px;
                    ">
                        Total Tickets Purchased:
                        <strong>${tickets.length}</strong>
                    </p>

                    <p style="
                        margin-top: 8px;
                        color: #666;
                        line-height: 1.7;
                        font-size: 15px;
                    ">
                        Amount Paid:
                        <strong>£${amount}</strong>
                    </p>

                </div>
            </div>

            <!-- TICKETS -->
            <h3 style="
                color: #111;
                font-size: 20px;
                margin-bottom: 18px;
            ">
                Your Ticket Numbers
            </h3>

            <div style="
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 35px;
            ">
                ${tickets.map(ticket => `
                    <div style="
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
    background: #000;
    color: #fff;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 1px;
    box-sizing: border-box;
    word-break: break-word;
">
    ${ticket.ticketCode}
</div>
                `).join("")}
            </div>

            ${hasInstantWin
            ?
            `
                <div style="
                    background: #f0fff2;
                    border: 1px solid #b7f3c1;
                    border-radius: 14px;
                    padding: 24px;
                    margin-bottom: 30px;
                ">
                    <h3 style="
                        color: #1f8f39;
                        margin-top: 0;
                        font-size: 22px;
                    ">
                        🎉 Instant Win Prize!
                    </h3>

                    ${instantWins.map(win => `
                        <p style="
                            color: #333;
                            font-size: 15px;
                            line-height: 1.7;
                        ">
                            You won:
                            <strong>${win.prize?.title}</strong>
                            with ticket
                            <strong>${win.ticketCode}</strong>
                        </p>
                    `).join("")}
                </div>
                `
            :
            ""
        }

            <p style="
                font-size: 15px;
                color: #666;
                line-height: 1.8;
            ">
                You can view all your tickets and entries anytime inside your account dashboard.
            </p>

        </div>

        <!-- FOOTER -->
        <div style="
            border-top: 1px solid #eee;
            padding: 28px;
            text-align: center;
            background: #fafafa;
        ">
            <p style="
                margin: 0;
                color: #888;
                font-size: 14px;
            ">
                Good luck 🍀<br/>
                <strong>DreamCar Competitions</strong>
            </p>
        </div>

    </div>
    
    `;
};

