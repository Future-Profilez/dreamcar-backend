
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
                alt="DreamCar"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                margin:0;
                font-size:32px;
                font-weight:700;
            ">
                Purchase Confirmed 🎉
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                Your competition entries are officially booked.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            <p style="
                color:#444444;
                font-size:16px;
                line-height:1.8;
                margin-top:0;
                margin-bottom:18px;
            ">
                Hi ${user.name},
            </p>

            <p style="
                color:#555555;
                font-size:15px;
                line-height:1.8;
                margin-bottom:30px;
            ">
                Thank you for entering 
                <strong>${competition.title}</strong>.
            </p>

            <!-- ORDER SUMMARY -->
            <div style="
                background:#fafafa;
                border:1px solid #eeeeee;
                border-radius:16px;
                padding:28px 24px;
                margin-bottom:30px;
            ">

                <h2 style="
                    margin-top:0;
                    margin-bottom:18px;
                    color:#111111;
                    font-size:24px;
                ">
                    ${competition.title}
                </h2>

                <p style="
                    margin:0 0 10px;
                    color:#666666;
                    font-size:15px;
                    line-height:1.7;
                ">
                    Total Tickets Purchased:
                    <strong>${tickets.length}</strong>
                </p>

                <p style="
                    margin:0;
                    color:#666666;
                    font-size:15px;
                    line-height:1.7;
                ">
                    Amount Paid:
                    <strong>£${amount}</strong>
                </p>

            </div>

            <!-- TICKETS -->
            <h3 style="
                color:#111111;
                font-size:20px;
                margin-bottom:18px;
            ">
                Your Ticket Numbers
            </h3>

            <div style="
                display:flex;
                flex-wrap:wrap;
                gap:12px;
                margin-bottom:35px;
            ">

                ${tickets.map(ticket => `

                    <div style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        min-width:120px;
                        background:#000000;
                        color:#ffffff;
                        padding:12px 16px;
                        border-radius:10px;
                        font-size:14px;
                        font-weight:700;
                        letter-spacing:1px;
                        box-sizing:border-box;
                    ">
                        ${ticket.ticketCode}
                    </div>

                `).join("")}

            </div>

            ${hasInstantWin
                ?
                `
                <div style="
                    background:#f4fff4;
                    border:1px solid #b7f3c1;
                    border-radius:16px;
                    padding:24px;
                    margin-bottom:30px;
                ">

                    <h3 style="
                        margin-top:0;
                        margin-bottom:16px;
                        color:#1f8f39;
                        font-size:22px;
                    ">
                        🎉 Instant Win Prize
                    </h3>

                    ${instantWins.map(win => `

                        <p style="
                            color:#444444;
                            font-size:15px;
                            line-height:1.8;
                            margin:0 0 10px;
                        ">
                            You won
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
                color:#666666;
                font-size:14px;
                line-height:1.8;
                margin-bottom:0;
            ">
                You can view all your tickets and entries anytime inside your account dashboard.
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
                Good luck 🍀<br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;
};
